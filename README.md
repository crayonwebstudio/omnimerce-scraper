# Omnimerce Scraper

Omnimerce unified scraper module, Google Maps, YouTube, Instagram, and web, with one output format and Omnimerce endpoint storage.

Live domain, planned: https://scraper.woodwolfdigital.com

Note on domain spelling: milan wrote scrapper.woodwolfidgital.com in chat. That looks like a typo for scraper.woodwolfdigital.com. This repo and the Coolify app use scraper.woodwolfdigital.com. If the literal typo domain was intended, say so in one word and the domain will be corrected.

## Status

Skeleton only. This is not a finished scraper.

- FastAPI backend with job create, list, and detail endpoints, using the unified record schema.
- Adapters for google_maps, youtube, instagram, and web are stubs. They return no fake data and they do not scrape yet. Each stub has a clear TODO.
- Frontend is a simple static placeholder, labelled as placeholder pending Metronic Tailwind React Vite integration.
- Metronic is NOT copied into this repo yet. The planned UI is Metronic Tailwind React Vite from the v9.4.13 upload, per docs/design.md. That upload was verified 2026-10-30 to contain all 44 previously missing Next.js Concept files, so the Next.js version is also complete in v9.4.13 if a Next.js frontend is chosen later. No Metronic code is in this repo yet.
- Omnimerce endpoint storage is not wired to a real endpoint yet. The endpoint URL and auth details are still pending from milan. See .env.example for placeholder values only.

## MVP scope

Phase 1, MVP:
1. Google Maps, business leads, via gosom/google-maps-scraper
2. YouTube, channels, videos, and public transcripts, via the YouTube Data API v3
3. Instagram, public profiles and posts, via Instaloader and the Instagram Graph API for own accounts
4. General web, public business websites and directory pages, via Playwright

Phase 2, after MVP is proven:
5. X (Twitter), public posts and profiles, with own account login only
6. Facebook, public Pages only
7. LinkedIn, public research only

LinkedIn guardrail, standing rule: no automated LinkedIn scraping, no guessed LinkedIn URLs, emails, or personal mobiles. A LinkedIn link is stored only if a public source actually shows that exact URL. Otherwise the row is marked: find on LinkedIn by name.

Full design: docs/design.md

## Unified record schema

Every adapter converts to the same record:

- source, source_url, type, name, category, location, address, phone, website, email, email_source
- social_links: instagram, facebook, linkedin, youtube, x
- rating, review_count, verified, verification_note, collected_at, job_id

Verification levels: Raw, Enriched, Verified. A Verified email must have a source URL, such as a company Impressum page.

## Run locally

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Then open http://localhost:8000/health and http://localhost:8000/

## API

- GET /health, returns status ok
- POST /api/jobs, body: source, query, location, limit, enrich_email
- GET /api/jobs, lists jobs
- GET /api/jobs/{id}, job detail, with results list, initially empty for stub adapters

No secrets in this repo. Use environment variables only. See .env.example for placeholder values only. Never commit a real .env file.

## Deploy

Dockerfile at the repo root exposes port 8000 and runs the FastAPI app. Coolify build pack is dockerfile, Dockerfile at /Dockerfile, ports_exposes 8000.
