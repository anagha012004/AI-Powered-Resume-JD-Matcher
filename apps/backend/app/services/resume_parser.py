"""
Resume section parser: extracts structured sections, scores completeness,
and ranks keywords by TF-IDF weight — inspired by srbhr/resume-matcher.
"""

import re
from collections import Counter
import math

# ── Section heading patterns ─────────────────────────────────────────────────

_SECTION_PATTERNS = {
    "contact": re.compile(
        r"(?:contact|personal\s+info(?:rmation)?|details)", re.I
    ),
    "summary": re.compile(
        r"(?:summary|objective|profile|about\s+me|professional\s+summary|career\s+objective)", re.I
    ),
    "skills": re.compile(
        r"(?:skills?|technical\s+skills?|core\s+competenc(?:ies|y)|expertise|technologies)", re.I
    ),
    "experience": re.compile(
        r"(?:experience|employment|work\s+history|professional\s+experience|career\s+history)", re.I
    ),
    "education": re.compile(
        r"(?:education|academic(?:s)?|qualifications?|degrees?|university|college)", re.I
    ),
    "projects": re.compile(
        r"(?:projects?|portfolio|open[\s-]?source|side\s+projects?)", re.I
    ),
    "certifications": re.compile(
        r"(?:certif(?:ications?|icates?)|licenses?|credentials?|accreditations?)", re.I
    ),
    "awards": re.compile(
        r"(?:awards?|honors?|achievements?|recognition|accomplishments?)", re.I
    ),
    "languages": re.compile(
        r"(?:languages?|spoken\s+languages?|linguistic\s+skills?)", re.I
    ),
    "publications": re.compile(
        r"(?:publications?|papers?|research|patents?)", re.I
    ),
}

# ── Contact extractors ────────────────────────────────────────────────────────

_EMAIL_RE  = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_PHONE_RE  = re.compile(r"(\+?\d[\d\s\-().]{7,}\d)")
_LINKEDIN_RE = re.compile(r"linkedin\.com/in/[\w\-]+", re.I)
_GITHUB_RE   = re.compile(r"github\.com/[\w\-]+", re.I)
_URL_RE      = re.compile(r"https?://[^\s]+")

# ── Inline section splitter ───────────────────────────────────────────────────

_HEADING_RE = re.compile(
    r"^[ \t]*([A-Z][A-Za-z &\/\-]{2,40})[ \t]*:?[ \t]*$",
    re.MULTILINE,
)


def _split_into_sections(text: str) -> dict[str, str]:
    """Split raw resume text into labelled sections."""
    lines = text.splitlines()
    sections: dict[str, list[str]] = {"_header": []}
    current = "_header"

    for line in lines:
        stripped = line.strip()
        matched_label: str | None = None

        for label, pat in _SECTION_PATTERNS.items():
            if stripped and pat.search(stripped) and len(stripped) < 60:
                matched_label = label
                break

        if matched_label:
            current = matched_label
            if current not in sections:
                sections[current] = []
        else:
            sections.setdefault(current, []).append(line)

    return {k: "\n".join(v).strip() for k, v in sections.items() if v}


# ── Completeness scoring ──────────────────────────────────────────────────────

_SECTION_WEIGHTS = {
    "contact":        15,
    "summary":        10,
    "skills":         20,
    "experience":     30,
    "education":      15,
    "projects":        5,
    "certifications":  3,
    "awards":          2,
}


def _score_completeness(sections: dict[str, str]) -> tuple[int, list[str]]:
    """Return completeness score (0–100) and list of missing important sections."""
    total_weight = sum(_SECTION_WEIGHTS.values())  # 100
    earned = 0
    missing = []
    for sec, weight in _SECTION_WEIGHTS.items():
        content = sections.get(sec, "")
        if content and len(content.strip()) > 10:
            earned += weight
        else:
            missing.append(sec)
    return min(100, int(earned * 100 / total_weight)), missing


# ── TF-IDF keyword ranker ─────────────────────────────────────────────────────

_STOP_WORDS = {
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "by","from","as","is","was","are","were","be","been","have","has","had",
    "do","does","did","will","would","could","should","may","might","shall",
    "not","no","nor","so","yet","both","either","neither","whether","while",
    "although","because","since","after","before","when","where","who","which",
    "that","this","these","those","it","its","we","our","you","your","they",
    "their","i","my","me","him","his","her","us","than","then","there","here",
    "can","just","also","more","most","some","any","all","each","every","other",
    "into","about","above","against","along","among","around","through","during",
    "without","within","between","under","over","up","down","out","off","over",
    "again","further","once","if","how","what","well","must","much","many","such",
}


def _tokenise(text: str) -> list[str]:
    tokens = re.findall(r"\b[a-zA-Z][a-zA-Z0-9\+#\-\.]{1,30}\b", text)
    return [t.lower() for t in tokens if t.lower() not in _STOP_WORDS and len(t) > 2]


def _tfidf_keywords(resume_text: str, jd_text: str, top_n: int = 30) -> list[dict]:
    """
    Compute TF-IDF keyword scores comparing resume to JD.
    Returns top_n keywords sorted by JD-TF × log(2 / (1 + resume_has_term)).
    """
    jd_tokens   = _tokenise(jd_text)
    res_tokens  = _tokenise(resume_text)

    jd_tf   = Counter(jd_tokens)
    res_set = set(res_tokens)

    # Total JD tokens for normalisation
    total = max(len(jd_tokens), 1)

    scored: list[dict] = []
    for term, count in jd_tf.items():
        tf_jd    = count / total
        # IDF-like: penalise terms already in resume
        idf_like = math.log(2.0 / (1.0 + (1 if term in res_set else 0)))
        score    = round(tf_jd * (1 + idf_like), 4)
        scored.append({
            "keyword":   term,
            "jd_tf":     round(tf_jd, 4),
            "score":     score,
            "in_resume": term in res_set,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]


# ── Contact extraction ────────────────────────────────────────────────────────

def extract_contact(text: str) -> dict:
    email    = (_EMAIL_RE.search(text) or ("",))[0] or None
    if hasattr(email, "group"):
        email = email.group()
    phone    = (_PHONE_RE.search(text) or ("",))[0] or None
    if hasattr(phone, "group"):
        phone = phone.group()
    linkedin = (m.group() if (m := _LINKEDIN_RE.search(text)) else None)
    github   = (m.group() if (m := _GITHUB_RE.search(text)) else None)
    return {
        "email":    email if isinstance(email, str) else None,
        "phone":    phone if isinstance(phone, str) else None,
        "linkedin": linkedin,
        "github":   github,
    }


def extract_contact_from_text(text: str) -> dict:
    email_m    = _EMAIL_RE.search(text)
    phone_m    = _PHONE_RE.search(text)
    linkedin_m = _LINKEDIN_RE.search(text)
    github_m   = _GITHUB_RE.search(text)
    return {
        "email":    email_m.group()    if email_m    else None,
        "phone":    phone_m.group(1)   if phone_m    else None,
        "linkedin": linkedin_m.group() if linkedin_m else None,
        "github":   github_m.group()   if github_m   else None,
    }


# ── Public API ────────────────────────────────────────────────────────────────

def parse_resume(resume_text: str, jd_text: str = "") -> dict:
    """
    Full structured parse of a resume.

    Returns:
      sections          – dict of section_name → text
      contact           – extracted email/phone/linkedin/github
      completeness_score – 0–100
      missing_sections  – sections with no or minimal content
      tfidf_keywords    – top JD keywords with in_resume flag + score
    """
    sections           = _split_into_sections(resume_text)
    completeness, missing = _score_completeness(sections)
    contact            = extract_contact_from_text(resume_text)
    keywords           = _tfidf_keywords(resume_text, jd_text) if jd_text else []

    return {
        "sections":           {k: v for k, v in sections.items() if not k.startswith("_")},
        "contact":            contact,
        "completeness_score": completeness,
        "missing_sections":   missing,
        "tfidf_keywords":     keywords,
    }
