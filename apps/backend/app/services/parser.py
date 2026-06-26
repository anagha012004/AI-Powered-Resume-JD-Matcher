import io
import re
import pdfplumber


def parse_pdf(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages).strip()


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_entities(text: str) -> dict:
    """Lightweight regex-based extraction as a spaCy-free alternative."""
    # Common tech keywords for resume context
    tech_pattern = re.compile(
        r"\b(Python|Java|JavaScript|TypeScript|Go|Rust|C\+\+|C#|Ruby|"
        r"FastAPI|Django|Flask|React|Next\.js|Vue|Angular|Node\.js|"
        r"AWS|GCP|Azure|Docker|Kubernetes|Terraform|Redis|PostgreSQL|"
        r"MySQL|MongoDB|SQLite|Kafka|Spark|Airflow|CI/CD|REST|GraphQL)\b",
        re.IGNORECASE,
    )
    skills = list({m.group() for m in tech_pattern.finditer(text)})
    return {"SKILL": skills}
