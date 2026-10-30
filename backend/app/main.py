"""Omnimerce Scraper, FastAPI skeleton.

No real scraping yet. Adapters are stubs and return no fake data.
"""
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .adapters import google_maps, instagram, web, youtube

app = FastAPI(title="Omnimerce Scraper", version="0.1.0")

JOBS = {}
ADAPTERS = {
    "google_maps": google_maps,
    "youtube": youtube,
    "instagram": instagram,
    "web": web,
}


class SocialLinks(BaseModel):
    instagram: str = ""
    facebook: str = ""
    linkedin: str = ""
    youtube: str = ""
    x: str = ""


class UnifiedRecord(BaseModel):
    source: str = ""
    source_url: str = ""
    type: str = "business"
    name: str = ""
    category: str = ""
    location: str = ""
    address: str = ""
    phone: str = ""
    website: str = ""
    email: str = ""
    email_source: str = ""
    social_links: SocialLinks = Field(default_factory=SocialLinks)
    rating: float = 0.0
    review_count: int = 0
    verified: bool = False
    verification_note: str = ""
    collected_at: str = ""
    job_id: str = ""


class JobCreate(BaseModel):
    source: str
    query: str
    location: str = ""
    limit: int = 100
    enrich_email: bool = False


class Job(BaseModel):
    id: str
    source: str
    query: str
    location: str = ""
    limit: int = 100
    enrich_email: bool = False
    status: str = "created"
    results: list[UnifiedRecord] = Field(default_factory=list)
    created_at: str = ""


@app.get("/health")
def health():
    return {"status": "ok", "service": "omnimerce-scraper"}


@app.post("/api/jobs", response_model=Job)
def create_job(payload: JobCreate):
    if payload.source not in ADAPTERS:
        raise HTTPException(status_code=400, detail="Unknown source. Use google_maps, youtube, instagram, or web.")
    if payload.limit < 1 or payload.limit > 1000:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000.")
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    adapter = ADAPTERS[payload.source]
    results = adapter.run(payload.query, payload.location, payload.limit, payload.enrich_email, job_id)
    job = Job(
        id=job_id,
        source=payload.source,
        query=payload.query,
        location=payload.location,
        limit=payload.limit,
        enrich_email=payload.enrich_email,
        status="stub_complete",
        results=results,
        created_at=now,
    )
    JOBS[job_id] = job
    return job


@app.get("/api/jobs", response_model=list[Job])
def list_jobs():
    return list(JOBS.values())


@app.get("/api/jobs/{job_id}", response_model=Job)
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


# Frontend is the Vite build output in frontend/dist, built by Docker.
# API routes above are defined first, so they are never shadowed by
# the static frontend. Deep SPA routes such as /scraper/dashboard
# fall back to index.html, so a refresh or direct link still loads
# the React app.
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@app.get("/")
def frontend_root():
    index = FRONTEND_DIST / "index.html"
    if not index.exists():
        raise HTTPException(status_code=404, detail="Frontend not built.")
    return FileResponse(str(index))


@app.get("/{full_path:path}")
def frontend_spa(full_path: str):
    candidate = FRONTEND_DIST / full_path
    if candidate.is_file():
        return FileResponse(str(candidate))
    index = FRONTEND_DIST / "index.html"
    if not index.exists():
        raise HTTPException(status_code=404, detail="Frontend not built.")
    return FileResponse(str(index))
