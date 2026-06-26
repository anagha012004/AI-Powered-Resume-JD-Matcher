FROM python:3.12-slim

WORKDIR /app

# System deps for pdfplumber, torch CPU, and reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv --no-cache-dir

# Copy dependency files first (layer cache)
COPY pyproject.toml ./
COPY uv.lock ./

# Install all production deps into the system Python (no venv in container)
RUN uv sync --no-dev --no-install-project --system

# Copy application code
COPY app/ ./app/

# Pre-download the MiniLM model so first request isn't slow
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
