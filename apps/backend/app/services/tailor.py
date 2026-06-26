from app.services.llm import llm_call
from app.services.resume_parser import _tfidf_keywords, _tokenise

SYSTEM = (
    "You are an expert resume writer who tailors resumes to specific job descriptions. "
    "You preserve the candidate's real experience but reframe, reorder, and reword to "
    "maximise relevance to the target role."
)

_DEPTH_INSTRUCTIONS = {
    "light": (
        "Make LIGHT edits only: fix 2-3 bullet points that most directly address missing keywords. "
        "Preserve structure, tone, and most of the original wording."
    ),
    "keywords": (
        "Perform KEYWORD ENHANCEMENT: naturally weave missing keywords into existing bullets "
        "and the skills section. Reorder skills to front-load the most relevant ones. "
        "Do not invent new experience."
    ),
    "full": (
        "Perform FULL TAILORING: rewrite the summary, reorder and expand bullets in experience "
        "to highlight the most relevant projects, rewrite the skills section to mirror the JD's "
        "language, and ensure every required qualification is addressed if the candidate has it."
    ),
}

TAILOR_PROMPT = """MASTER RESUME:
{master_resume}

JOB DESCRIPTION:
{jd_text}

TAILORING DEPTH: {depth_label}
{depth_instruction}

Return ONLY valid JSON with NO markdown:
{{
  "tailored_resume": "<full tailored resume text — preserve all real experience, no fabrication>",
  "changes_summary": ["<change 1>", "<change 2>", "<change 3>"],
  "covered_requirements": ["<JD requirement that is now addressed>"],
  "missing_requirements": ["<JD requirement the candidate genuinely lacks>"]
}}"""

COVER_LETTER_PROMPT = """Write a cover letter for this candidate applying to this role.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

TONE: {tone}

Return ONLY valid JSON with NO markdown:
{{
  "subject_line": "<email subject line>",
  "cover_letter": "<full cover letter — 3-4 paragraphs, no Dear Hiring Manager boilerplate>"
}}"""

OUTREACH_PROMPT = """Write a {platform} outreach message for this candidate reaching out about this role.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

Platform guidelines:
- linkedin: ≤ 300 chars, punchy opener, specific hook from JD
- email: subject + body, 2 short paragraphs
- cold_email: subject + body, 3 paragraphs, value-first

Return ONLY valid JSON with NO markdown:
{{
  "subject": "<subject line, or null for linkedin>",
  "message": "<the outreach message>"
}}"""


def _compute_jd_match(tailored_text: str, jd_text: str) -> dict:
    """Compute match % and per-keyword coverage against the JD."""
    keywords = _tfidf_keywords(tailored_text, jd_text, top_n=25)
    tailored_tokens = set(_tokenise(tailored_text))
    highlighted = [
        {"keyword": k["keyword"], "found": k["keyword"].lower() in tailored_tokens}
        for k in keywords
    ]
    found_count = sum(1 for k in highlighted if k["found"])
    match_pct   = int(found_count / len(highlighted) * 100) if highlighted else 0
    return {
        "match_percentage": match_pct,
        "highlighted_keywords": highlighted,
    }


async def tailor_resume(master_resume: str, jd_text: str, depth: str) -> dict:
    prompt = TAILOR_PROMPT.format(
        master_resume=master_resume[:10000],
        jd_text=jd_text[:4000],
        depth_label=depth.upper(),
        depth_instruction=_DEPTH_INSTRUCTIONS[depth],
    )
    result = await llm_call(SYSTEM, prompt, temperature=0.25)
    tailored = result.get("tailored_resume", master_resume)
    match_data = _compute_jd_match(tailored, jd_text)
    return {
        "tailored_resume":  tailored,
        "changes_summary":  result.get("changes_summary", []),
        "jd_match": {
            **match_data,
            "covered_requirements": result.get("covered_requirements", []),
            "missing_requirements": result.get("missing_requirements", []),
        },
    }


async def generate_cover_letter(resume_text: str, jd_text: str, tone: str) -> dict:
    prompt = COVER_LETTER_PROMPT.format(
        resume_text=resume_text[:8000],
        jd_text=jd_text[:4000],
        tone=tone,
    )
    return await llm_call(SYSTEM, prompt, temperature=0.4)


async def generate_outreach(resume_text: str, jd_text: str, platform: str) -> dict:
    prompt = OUTREACH_PROMPT.format(
        resume_text=resume_text[:6000],
        jd_text=jd_text[:3000],
        platform=platform,
    )
    return await llm_call(SYSTEM, prompt, temperature=0.4)
