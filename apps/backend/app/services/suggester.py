from app.services.llm import llm_call

SYSTEM = (
    "You are an expert resume coach helping candidates tailor their resume "
    "to a specific job description."
)

SUGGEST_PROMPT = """Given this resume and job description, suggest specific improvements.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

MISSING KEYWORDS IDENTIFIED: {missing_keywords}

Return ONLY valid JSON with NO markdown:
{{
  "suggested_edits": [
    {{
      "section": "<Experience / Skills / Summary>",
      "original": "<original bullet or phrase from resume, or null if adding new>",
      "suggested": "<improved version incorporating JD keywords naturally>",
      "reason": "<one sentence why this change helps>"
    }}
  ],
  "keywords_to_add": ["<keyword>"],
  "summary_rewrite": "<optional improved professional summary targeting this JD>"
}}"""


async def get_suggestions(resume_text: str, jd_text: str, missing_keywords: list[str]) -> dict:
    prompt = SUGGEST_PROMPT.format(
        resume_text=resume_text[:8000],
        jd_text=jd_text[:4000],
        missing_keywords=", ".join(missing_keywords),
    )
    return await llm_call(SYSTEM, prompt, temperature=0.3)
