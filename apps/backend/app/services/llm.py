"""
LLM fallback chain: Gemini (primary) → Groq → OpenRouter.

Each provider is tried in order. A provider is skipped if:
  - Its API key is not configured, OR
  - It raises a rate-limit / quota / auth error (we fall through to the next)

Any other exception (network, JSON parse) is also caught and falls through.
If all providers fail, raises HTTPException(503).
"""

import asyncio
import json
import logging
from functools import partial

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
from openai import OpenAI, RateLimitError, AuthenticationError, APIError
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

# ── Provider initialisation ──────────────────────────────────────────────────

genai.configure(api_key=settings.gemini_api_key)

_groq_client: OpenAI | None = (
    OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")
    if settings.groq_api_key
    else None
)

_openrouter_client: OpenAI | None = (
    OpenAI(
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
    )
    if settings.openrouter_api_key
    else None
)

# ── JSON parser (shared) ──────────────────────────────────────────────────────

def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


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
            {"role": "user", "content": prompt},
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
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        max_tokens=2048,
    )
    return _parse_json(resp.choices[0].message.content)


# ── Fallback orchestrator ────────────────────────────────────────────────────

# Errors that mean "this provider is unavailable right now — try the next one"
_FALLTHROUGH_GEMINI = (ResourceExhausted, GoogleAPIError)
_FALLTHROUGH_OPENAI = (RateLimitError, AuthenticationError, APIError)


def _call_with_fallback(system: str, prompt: str, temperature: float) -> dict:
    providers = []

    if settings.gemini_api_key:
        providers.append(("Gemini", _call_gemini))
    if settings.groq_api_key and _groq_client:
        providers.append(("Groq", _call_groq))
    if settings.openrouter_api_key and _openrouter_client:
        providers.append(("OpenRouter", _call_openrouter))

    if not providers:
        raise HTTPException(status_code=503, detail="No LLM provider configured. Set at least one API key.")

    last_error: Exception | None = None

    for name, caller in providers:
        try:
            logger.info("LLM call → %s", name)
            result = caller(system, prompt, temperature)
            logger.info("LLM call ✓ %s", name)
            return result
        except _FALLTHROUGH_GEMINI as e:
            logger.warning("Gemini unavailable (%s), trying next provider.", e.__class__.__name__)
            last_error = e
        except _FALLTHROUGH_OPENAI as e:
            logger.warning("%s unavailable (%s), trying next provider.", name, e.__class__.__name__)
            last_error = e
        except (json.JSONDecodeError, AssertionError) as e:
            logger.warning("%s returned unparseable response: %s", name, e)
            last_error = e
        except Exception as e:
            logger.warning("%s unexpected error: %s", name, e)
            last_error = e

    raise HTTPException(
        status_code=503,
        detail=f"All LLM providers failed. Last error: {type(last_error).__name__}: {last_error}",
    )


async def llm_call(system: str, prompt: str, temperature: float = 0.1) -> dict:
    """Async wrapper — runs the sync fallback chain in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, partial(_call_with_fallback, system, prompt, temperature)
    )
