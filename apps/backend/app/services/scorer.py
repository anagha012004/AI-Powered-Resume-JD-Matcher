from app.services.llm import llm_call, _parse_json  # re-export _parse_json for suggester

SYSTEM = (
    "You are an expert ATS (Applicant Tracking System) and technical recruiter. "
    "Analyze resumes against job descriptions with precision."
)

SCORE_PROMPT = """Analyze the following resume against the job description.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

SEMANTIC SIMILARITY SCORE (pre-computed, use as a reference signal): {baseline_score}

Return ONLY a valid JSON object with NO markdown, NO explanation outside the JSON:
{{
  "match_score": <integer 0-100>,
  "justification": "<2-3 sentence explanation of the score>",
  "matched_keywords": ["<keyword1>", "<keyword2>"],
  "missing_keywords": ["<keyword1>", "<keyword2>"],
  "section_scores": {{
    "skills": <integer 0-100>,
    "experience": <integer 0-100>,
    "education": <integer 0-100>
  }},
  "ats_flags": ["<any ATS formatting issues found in the resume>"]
}}"""


async def score_with_gemini(resume_text: str, jd_text: str, baseline_score: float) -> dict:
    prompt = SCORE_PROMPT.format(
        resume_text=resume_text[:8000],
        jd_text=jd_text[:4000],
        baseline_score=round(baseline_score, 4),
    )
    return await llm_call(SYSTEM, prompt, temperature=0.1)
