"""
PDF resume renderer using ReportLab.
Four templates: swiss_single, swiss_two, modern, modern_two.
"""

import io
from reportlab.lib.pagesizes import A4, letter as LETTER
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, KeepTogether,
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

PAGE_SIZES = {"A4": A4, "Letter": LETTER}


def _hex_color(hex_str: str):
    h = hex_str.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return colors.Color(r / 255, g / 255, b / 255)


def _bullet_lines(content: str) -> list[str]:
    return [ln.strip() for ln in content.splitlines() if ln.strip()]


def _is_bullet(line: str) -> bool:
    return line.startswith(("-", "•", "*", "·"))


def _strip_bullet(line: str) -> str:
    return line.lstrip("-•*· ").strip()


# ── Style factory ─────────────────────────────────────────────────────────────

def _make_styles(fmt, accent: colors.Color):
    base   = fmt.fonts.base_size
    hfont  = fmt.fonts.header_family
    bfont  = fmt.fonts.body_family
    lh     = fmt.line_height

    return {
        "name": ParagraphStyle("name", fontName=f"{hfont}-Bold",
                               fontSize=base * fmt.fonts.header_scale * 1.4,
                               leading=lh * 1.8, textColor=colors.HexColor("#0f0f19"),
                               alignment=TA_LEFT),
        "contact": ParagraphStyle("contact", fontName=bfont,
                                  fontSize=base * 0.85, leading=lh * 0.9,
                                  textColor=colors.HexColor("#555566")),
        "section_head": ParagraphStyle("section_head", fontName=f"{hfont}-Bold",
                                       fontSize=base * 1.05, leading=lh * 1.2,
                                       textColor=accent, spaceAfter=2),
        "job_title": ParagraphStyle("job_title", fontName=f"{hfont}-Bold",
                                    fontSize=base * 0.95, leading=lh,
                                    textColor=colors.HexColor("#1a1a2e")),
        "job_meta": ParagraphStyle("job_meta", fontName=bfont,
                                   fontSize=base * 0.82, leading=lh * 0.9,
                                   textColor=colors.HexColor("#666677")),
        "bullet": ParagraphStyle("bullet", fontName=bfont,
                                 fontSize=base * 0.88, leading=lh,
                                 leftIndent=10, firstLineIndent=-8,
                                 textColor=colors.HexColor("#222233")),
        "body": ParagraphStyle("body", fontName=bfont,
                               fontSize=base * 0.88, leading=lh,
                               textColor=colors.HexColor("#222233")),
        "skill_chip": ParagraphStyle("skill_chip", fontName=bfont,
                                     fontSize=base * 0.82, leading=lh * 0.95,
                                     textColor=colors.HexColor("#333344")),
        "sidebar_head": ParagraphStyle("sidebar_head", fontName=f"{hfont}-Bold",
                                       fontSize=base * 0.92, leading=lh * 1.1,
                                       textColor=accent),
        "sidebar_body": ParagraphStyle("sidebar_body", fontName=bfont,
                                       fontSize=base * 0.82, leading=lh * 0.95,
                                       textColor=colors.HexColor("#333344")),
    }


# ── Section renderers ─────────────────────────────────────────────────────────

def _render_section_header(title: str, styles: dict, accent: colors.Color) -> list:
    elems = [
        Spacer(1, 6),
        Paragraph(title.upper(), styles["section_head"]),
        HRFlowable(width="100%", thickness=0.5, color=accent, spaceAfter=4),
    ]
    return elems


def _render_section_content(content: str, styles: dict) -> list:
    elems = []
    lines = _bullet_lines(content)
    i = 0
    while i < len(lines):
        line = lines[i]
        # Detect "Job Title | Company | Dates" pattern (contains "|")
        if "|" in line and not _is_bullet(line):
            parts = [p.strip() for p in line.split("|")]
            elems.append(Paragraph(f"<b>{parts[0]}</b>", styles["job_title"]))
            if len(parts) > 1:
                elems.append(Paragraph(" | ".join(parts[1:]), styles["job_meta"]))
        elif _is_bullet(line):
            elems.append(Paragraph(f"• {_strip_bullet(line)}", styles["bullet"]))
        else:
            elems.append(Paragraph(line, styles["body"]))
        i += 1
    return elems


def _render_skills_inline(content: str, styles: dict) -> list:
    """Render skills as a comma-separated line (compact) or grouped bullets."""
    lines = _bullet_lines(content)
    skills = [_strip_bullet(l) for l in lines if l.strip()]
    text = "  ·  ".join(skills)
    return [Paragraph(text, styles["skill_chip"])]


# ── Template: Swiss Single Column ─────────────────────────────────────────────

def _build_swiss_single(doc_obj, resume, fmt, styles, accent, story):
    # Header
    name_parts = [resume.name]
    story.append(Paragraph(resume.name, styles["name"]))
    contacts = []
    if fmt.contact_icons:
        if resume.email:    contacts.append(f"✉ {resume.email}")
        if resume.phone:    contacts.append(f"✆ {resume.phone}")
        if resume.linkedin: contacts.append(f"in {resume.linkedin}")
        if resume.github:   contacts.append(f"⌥ {resume.github}")
        if resume.location: contacts.append(f"⌖ {resume.location}")
    else:
        for v in [resume.email, resume.phone, resume.linkedin, resume.github, resume.location]:
            if v: contacts.append(v)
    if contacts:
        story.append(Paragraph("   |   ".join(contacts), styles["contact"]))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1, color=accent, spaceAfter=6))

    for sec in sorted(resume.sections, key=lambda s: s.order):
        story.extend(_render_section_header(sec.title, styles, accent))
        if sec.type == "skills":
            story.extend(_render_skills_inline(sec.content, styles))
        else:
            story.extend(_render_section_content(sec.content, styles))
        if not fmt.compact_mode:
            story.append(Spacer(1, fmt.section_spacing * 0.5))


# ── Template: Swiss Two Column ────────────────────────────────────────────────

def _build_two_column(doc_obj, resume, fmt, styles, accent, story, modern=False):
    col_ratio   = 0.32    # left sidebar width fraction
    page_w      = doc_obj.width
    left_w      = page_w * col_ratio
    right_w     = page_w * (1 - col_ratio) - 10

    # Sidebar sections: skills, education, certifications, languages, awards
    SIDEBAR_TYPES = {"skills", "education", "certifications", "languages", "awards", "custom"}
    MAIN_TYPES    = {"summary", "experience", "projects"}

    sidebar_secs = [s for s in sorted(resume.sections, key=lambda x: x.order)
                    if s.type in SIDEBAR_TYPES]
    main_secs    = [s for s in sorted(resume.sections, key=lambda x: x.order)
                    if s.type in MAIN_TYPES]
    # fallback: anything not categorised goes main
    all_typed = {s.type for s in resume.sections}
    remainder = [s for s in sorted(resume.sections, key=lambda x: x.order)
                 if s.type not in SIDEBAR_TYPES and s.type not in MAIN_TYPES]
    main_secs += remainder

    # Header (full width)
    story.append(Paragraph(resume.name, styles["name"]))
    contacts = []
    for icon, val in [("✉", resume.email), ("✆", resume.phone),
                      ("in", resume.linkedin), ("⌥", resume.github), ("⌖", resume.location)]:
        if val:
            contacts.append(f"{icon if fmt.contact_icons else ''} {val}".strip())
    if contacts:
        story.append(Paragraph("   |   ".join(contacts), styles["contact"]))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1, color=accent, spaceAfter=8))

    # Build sidebar content
    sidebar_elems: list = []
    if modern:
        # Accent background block effect via paragraph background
        sidebar_elems.append(Spacer(1, 2))
    for sec in sidebar_secs:
        sidebar_elems.append(Paragraph(sec.title.upper(), styles["sidebar_head"]))
        sidebar_elems.append(HRFlowable(width="100%", thickness=0.4, color=accent, spaceAfter=3))
        lines = _bullet_lines(sec.content)
        for line in lines:
            text = _strip_bullet(line) if _is_bullet(line) else line
            sidebar_elems.append(Paragraph(f"• {text}" if sec.type != "skills" else text,
                                           styles["sidebar_body"]))
        sidebar_elems.append(Spacer(1, fmt.section_spacing * 0.6))

    # Build main content
    main_elems: list = []
    for sec in main_secs:
        main_elems.append(Paragraph(sec.title.upper(), styles["section_head"]))
        main_elems.append(HRFlowable(width="100%", thickness=0.5, color=accent, spaceAfter=4))
        main_elems.extend(_render_section_content(sec.content, styles))
        main_elems.append(Spacer(1, fmt.section_spacing * 0.5))

    # Place as Table
    data = [[sidebar_elems, main_elems]]
    col_widths = [left_w, right_w]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("RIGHTPADDING",(0, 0), (0, -1), 12),
        ("LEFTPADDING", (1, 0), (1, -1), 12),
        ("RIGHTPADDING",(1, 0), (1, -1), 0),
        ("LINEAFTER",   (0, 0), (0, -1), 0.5, colors.HexColor("#ddddee")),
    ]))
    story.append(t)


# ── Public builder ─────────────────────────────────────────────────────────────

def build_pdf(resume, template: str, fmt) -> bytes:
    buf    = io.BytesIO()
    ps     = PAGE_SIZES.get(fmt.page_size, A4)
    accent = _hex_color(fmt.accent_color)

    doc = SimpleDocTemplate(
        buf,
        pagesize=ps,
        leftMargin=fmt.margin_left,
        rightMargin=fmt.margin_right,
        topMargin=fmt.margin_top,
        bottomMargin=fmt.margin_bottom,
    )

    styles = _make_styles(fmt, accent)
    story: list = []

    if template == "swiss_single":
        _build_swiss_single(doc, resume, fmt, styles, accent, story)
    elif template == "swiss_two":
        _build_two_column(doc, resume, fmt, styles, accent, story, modern=False)
    elif template == "modern":
        _build_swiss_single(doc, resume, fmt, styles, accent, story)
    elif template == "modern_two":
        _build_two_column(doc, resume, fmt, styles, accent, story, modern=True)
    else:
        _build_swiss_single(doc, resume, fmt, styles, accent, story)

    doc.build(story)
    return buf.getvalue()
