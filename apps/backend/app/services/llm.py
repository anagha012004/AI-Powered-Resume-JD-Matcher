"""
LLM fallback chain: Gemini (primary) → Groq → OpenRouter.

Each provider is tried in order. On a rate-limit (429) the chain:
  1. Records the retry_after_seconds hint from the response header/body
  2. Tries the next provider immediately
  3. If ALL providers are rate-limited, waits for the shortest retry_after
     then retries the full chain once before giving up with a clean 429.

If all providers fail for non-rate-limit reasons, raises HTTPException(503).
"""

import asyncio
import json
import logging
import re
import time
from functools import partial

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
from openai import OpenAI, RateLimitError, AuthenticationError, APIError
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

# ── Provider initialisation ───────────────────────────────────────────────────

genai.configure(api_key=settings.gemini_api_key)

_groq_client: OpenAI | None = (
    OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")
    if settings.groq_api_key else None
)

_openrouter_client: OpenAI | None = (
    OpenAI(api_key=settings.openrouter_api_key, base_url="https://openrouter.ai/api/v1")
    if settings.openrouter_api_key else None
)

# ── JSON parser ───────────────────────────────────────────────────────────────

def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


# ── retry_after extractor ─────────────────────────────────────────────────────

def _extract_retry_after(exc: Exception) -> float | None:
    """Pull retry_after_seconds out of an OpenAI RateLimitError body, if present."""
    try:
        body = str(exc)
        # OpenRouter embeds it as: 'retry_after_seconds': 28.389
        m = re.search(r"retry_after_seconds['\"]?\s*:\s*([\d.]+)", body)
        if m:
            return float(m.group(1))
        # Standard Retry-After header (integer seconds)
        m2 = re.search(r"Retry-After['\"]?\s*:\s*['\"]?([\d.]+)", body)
        if m2:
            return float(m2.group(1))
    except Exception:
        pass
    return None


# ── Per-provider sync callers ─────────────────────────────────────────────────

def _call_gemini(system: str, prompt: str, temperature: float) -> dict:
    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=system,
    )
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(temperature=temperature),
    )
    return _parse_json(response.text)


def _call_groq(system: str, prompt: str, temperature: float) -> dict:
    assert _groq_client is not None
    resp = _groq_client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
        temperature=temperature,
        max_tokens=2048,
    )
    return _parse_json(resp.choices[0].message.content)


def _call_openrouter(system: str, prompt: str, temperature: float) -> dict:
    assert _openrouter_client is not None
    resp = _openrouter_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
        temperature=temperature,
        max_tokens=2048,
    )
    return _parse_json(resp.choices[0].message.content)


# ── Fallback orchestrator ─────────────────────────────────────────────────────

_FALLTHROUGH_GEMINI = (ResourceExhausted, GoogleAPIError)
_FALLTHROUGH_OPENAI = (RateLimitError, AuthenticationError, APIError)
_MAX_RETRY_WAIT     = 35.0   # never block the thread longer than this


def _call_with_fallback(system: str, prompt: str, temperature: float) -> dict:
    providers = []
    if settings.gemini_api_key:
        providers.append(("Gemini", _call_gemini))
    if settings.groq_api_key and _groq_client:
        providers.append(("Groq", _call_groq))
    if settings.openrouter_api_key and _openrouter_client:
        providers.append(("OpenRouter", _call_openrouter))

    if not providers:
        raise HTTPException(
            status_code=503,
            detail="No LLM provider configured. Add at least one API key in .env."
        )

    # ── First pass ──────────────────────────────────────────────────────────
    rate_limited: list[tuple[str, float]] = []   # (name, retry_after)
    last_error: Exception | None = None

    for name, caller in providers:
        try:
            logger.info("LLM → %s", name)
            result = caller(system, prompt, temperature)
            logger.info("LLM ✓ %s", name)
            return result
        except _FALLTHROUGH_GEMINI as e:
            logger.warning("Gemini quota/error — falling through. %s", e.__class__.__name__)
            # Gemini ResourceExhausted is effectively a rate limit
            rate_limited.append((name, 30.0))
            last_error = e
        except RateLimitError as e:
            wait = _extract_retry_after(e) or 30.0
            logger.warning("%s rate-limited (retry in %.0fs) — falling through.", name, wait)
            rate_limited.append((name, wait))
            last_error = e
        except (AuthenticationError, APIError) as e:
            logger.warning("%s auth/API error — falling through. %s", name, e)
            last_error = e
        except (json.JSONDecodeError, AssertionError) as e:
            logger.warning("%s unparseable response — falling through. %s", name, e)
            last_error = e
        except Exception as e:
            logger.warning("%s unexpected error — falling through. %s", name, e)
            last_error = e

    # ── All providers failed on first pass ───────────────────────────────────
    # If every failure was a rate-limit, wait the minimum retry_after and retry once
    if rate_limited and len(rate_limited) == len(providers):
        min_wait = min(w for _, w in rate_limited)
        capped   = min(min_wait, _MAX_RETRY_WAIT)
        logger.warning(
            "All providers rate-limited. Waiting %.0fs before one retry…", capped
        )
        time.sleep(capped)

        for name, caller in providers:
            try:
                logger.info("LLM retry → %s", name)
                result = caller(system, prompt, temperature)
                logger.info("LLM retry ✓ %s", name)
                return result
            except Exception as e:
                logger.warning("LLM retry failed for %s: %s", name, e)
                last_error = e

        # After retry still all failed — raise a clean 429 so the frontend
        # can show a human-readable message
        raise HTTPException(
            status_code=429,
            detail=(
                f"All AI providers are currently rate-limited. "
                f"Please wait ~{int(min_wait)}s and try again."
            ),
        )

    raise HTTPException(
        status_code=503,
        detail="AI service unavailable. Please try again in a moment.",
    )


async def llm_call(system: str, prompt: str, temperature: float = 0.1) -> dict:
    """Async wrapper — runs the sync fallback chain in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, partial(_call_with_fallback, system, prompt, temperature)
    )
