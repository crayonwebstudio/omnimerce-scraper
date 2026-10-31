"""Omnimerce Scraper, FastAPI skeleton.

No real scraping yet. Adapters are stubs and return no fake data.
"""
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import coreclaw
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
    worker: str = ""
    coreclaw_run_id: str = ""
    coreclaw_dataset_id: str = ""


class CoreClawJobCreate(BaseModel):
    worker: str
    query: str
    location: str = ""
    limit: int = 100


class CoreClawStatus(BaseModel):
    coreclaw_configured: bool
    workers: list = Field(default_factory=list)
    source: str | None = None


class CoreClawTokenCreate(BaseModel):
    token: str


class CoreClawTokenStatus(BaseModel):
    configured: bool
    source: str | None = None
    masked_hint: str | None = None


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


@app.get("/api/coreclaw/status", response_model=CoreClawStatus)
def coreclaw_status():
    return CoreClawStatus(
        coreclaw_configured=coreclaw.configured(),
        workers=coreclaw.WORKERS,
        source=coreclaw.token_source(),
    )


@app.post("/api/coreclaw/token", response_model=CoreClawTokenStatus)
def save_coreclaw_token(payload: CoreClawTokenCreate):
    if not payload.token or not payload.token.strip():
        raise HTTPException(status_code=400, detail="Token is required.")
    try:
        coreclaw.save_token(payload.token)
    except PermissionError:
        raise HTTPException(
            status_code=401, detail="CoreClaw rejected this token. It was not stored."
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CoreClaw token check failed: {exc}")
    return CoreClawTokenStatus(
        configured=coreclaw.configured(),
        source=coreclaw.token_source(),
        masked_hint=coreclaw.masked_hint(),
    )


@app.get("/api/coreclaw/token-status", response_model=CoreClawTokenStatus)
def coreclaw_token_status():
    return CoreClawTokenStatus(
        configured=coreclaw.configured(),
        source=coreclaw.token_source(),
        masked_hint=coreclaw.masked_hint(),
    )


@app.delete("/api/coreclaw/token", response_model=CoreClawTokenStatus)
def delete_coreclaw_token():
    coreclaw.clear_token()
    return CoreClawTokenStatus(
        configured=coreclaw.configured(),
        source=coreclaw.token_source(),
        masked_hint=coreclaw.masked_hint(),
    )


def _refresh_coreclaw_job(job: Job):
    if job.source != "coreclaw" or job.status != "running":
        return job
    if not job.coreclaw_run_id:
        return job
    try:
        run = coreclaw.get_run(job.coreclaw_run_id)
    except Exception as exc:
        job.status = "failed"
        job.results = []
        return job
    status = (run.get("status") or "").lower()
    if run.get("dataset_id"):
        job.coreclaw_dataset_id = run["dataset_id"]
    if status in ("succeeded", "finished", "completed", "success"):
        if not job.coreclaw_dataset_id:
            job.status = "failed"
            return job
        try:
            items = coreclaw.get_dataset_items(job.coreclaw_dataset_id)
        except Exception:
            job.status = "failed"
            return job
        records = []
        for item in items[: job.limit]:
            mapped = coreclaw.map_item(
                item, job.worker, job.id, job.query, job.location
            )
            if mapped and mapped["name"]:
                mapped["verification_note"] = (
                    f"CoreClaw run {job.coreclaw_run_id}"
                )
                mapped["collected_at"] = job.created_at
                records.append(UnifiedRecord(**mapped))
        job.results = records
        job.status = "succeeded"
    elif status in ("failed", "error", "cancelled", "canceled", "timeout"):
        job.status = "failed"
    return job


@app.post("/api/coreclaw/jobs", response_model=Job)
def create_coreclaw_job(payload: CoreClawJobCreate):
    if not coreclaw.configured():
        raise HTTPException(
            status_code=503,
            detail="CoreClaw is not connected. Save a CoreClaw token in Settings, or set CORECLAW_TOKEN in Coolify for app omnimerce-scraper, then redeploy.",
        )
    if payload.worker not in coreclaw.WORKER_IDS:
        raise HTTPException(status_code=400, detail="Unknown CoreClaw worker.")
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query is required.")
    if payload.limit < 1 or payload.limit > 1000:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000.")
    urls = [
        line.strip()
        for line in payload.query.splitlines()
        if line.strip()
    ]
    query = urls[0] if urls else payload.query.strip()
    if payload.worker in (
        "coreclaw~instagram-profile-scraper",
        "coreclaw~youtube-channel-scraper",
    ):
        query = payload.query.strip()
    custom_input = coreclaw.build_input(
        payload.worker, query, payload.location, payload.limit, urls
    )
    try:
        run = coreclaw.start_run(payload.worker, custom_input)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CoreClaw run failed: {exc}")
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    job = Job(
        id=job_id,
        source="coreclaw",
        query=payload.query.strip(),
        location=payload.location,
        limit=payload.limit,
        enrich_email=False,
        status="running",
        results=[],
        created_at=now,
        worker=payload.worker,
        coreclaw_run_id=run.get("run_id", ""),
        coreclaw_dataset_id=run.get("dataset_id", ""),
    )
    JOBS[job_id] = job
    return job


@app.get("/api/coreclaw/jobs", response_model=list[Job])
def list_coreclaw_jobs():
    return [job for job in JOBS.values() if job.source == "coreclaw"]


@app.get("/api/coreclaw/jobs/{job_id}", response_model=Job)
def get_coreclaw_job(job_id: str):
    job = JOBS.get(job_id)
    if job is None or job.source != "coreclaw":
        raise HTTPException(status_code=404, detail="CoreClaw job not found.")
    return _refresh_coreclaw_job(job)


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
