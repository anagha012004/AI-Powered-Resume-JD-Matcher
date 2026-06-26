from pydantic import BaseModel
from typing import Literal, Optional


# ── Tailor ────────────────────────────────────────────────────────────────────

class TailorRequest(BaseModel):
    master_resume: str
    jd_text: str
    depth: Literal["light", "keywords", "full"] = "keywords"


class HighlightedKeyword(BaseModel):
    keyword: str
    found: bool          # True = present in tailored resume


class JDMatch(BaseModel):
    match_percentage: int
    highlighted_keywords: list[HighlightedKeyword]
    covered_requirements: list[str]
    missing_requirements: list[str]


class TailorResponse(BaseModel):
    tailored_resume: str
    jd_match: JDMatch
    changes_summary: list[str]    # bullet list of what was changed


# ── Cover letter ──────────────────────────────────────────────────────────────

class CoverLetterRequest(BaseModel):
    resume_text: str
    jd_text: str
    tone: Literal["professional", "enthusiastic", "concise"] = "professional"


class CoverLetterResponse(BaseModel):
    cover_letter: str
    subject_line: str


# ── Outreach ──────────────────────────────────────────────────────────────────

class OutreachRequest(BaseModel):
    resume_text: str
    jd_text: str
    platform: Literal["linkedin", "email", "cold_email"] = "linkedin"


class OutreachResponse(BaseModel):
    message: str
    subject: Optional[str] = None    # only for email platforms


# ── PDF Export ────────────────────────────────────────────────────────────────

class FontOptions(BaseModel):
    header_family: str = "Helvetica"
    body_family:   str = "Helvetica"
    base_size:     float = 10.0
    header_scale:  float = 1.4


class FormattingOptions(BaseModel):
    page_size:       Literal["A4", "Letter"] = "A4"
    margin_top:      float = 40.0
    margin_bottom:   float = 40.0
    margin_left:     float = 50.0
    margin_right:    float = 50.0
    section_spacing: float = 14.0
    item_spacing:    float = 5.0
    line_height:     float = 14.0
    compact_mode:    bool  = False
    contact_icons:   bool  = True
    accent_color:    str   = "#6366f1"
    fonts:           FontOptions = FontOptions()


class ResumeSection(BaseModel):
    type:    str          # "summary" | "experience" | "skills" | "education" | "projects" | "custom"
    title:   str
    content: str          # markdown-ish plain text; bullets start with "- "
    order:   int = 0


class ResumeData(BaseModel):
    name:        str
    email:       Optional[str] = None
    phone:       Optional[str] = None
    linkedin:    Optional[str] = None
    github:      Optional[str] = None
    location:    Optional[str] = None
    sections:    list[ResumeSection] = []


class PDFExportRequest(BaseModel):
    resume:      ResumeData
    template:    Literal["swiss_single", "swiss_two", "modern", "modern_two"] = "modern"
    formatting:  FormattingOptions = FormattingOptions()
