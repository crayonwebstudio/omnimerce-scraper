"""CoreClaw client for the Omnimerce scraper.

Token is read from the CORECLAW_TOKEN environment variable only.
It is never stored in code, in a file, or in a log. If the variable
is not set, callers must return a clear not-connected error and
must never return fake results.

Worker ids below were verified against CoreClaw before being
listed here. Do not add a worker id without verifying it first.
"""
import json
import os
import urllib.error
import urllib.request

BASE = "https://openapi.coreclaw.com/api/v2"

WORKERS = [
    {
        "id": "coreclaw~google-maps-scraper",
        "name": "Google Maps",
        "version": "v1.3.5",
        "purpose": "Public Google Maps business places: name, address, phone, website, rating, review count, categories, and published social links.",
        "input": "keywords: list of search terms; base_location: one location, for example Berlin, Germany; max_results: number per search term; lang: en",
    },
    {
        "id": "coreclaw~instagram-profile-scraper",
        "name": "Instagram Profiles",
        "version": "v1.0.6",
        "purpose": "Public Instagram profile metadata by profile URL, one URL per line in the form.",
        "input": "profile_url: list of public profile URLs",
    },
    {
        "id": "coreclaw~google-search-scraper",
        "name": "Google Search",
        "version": "v1.1.1",
        "purpose": "Public Google search results by keyword, with an optional location.",
        "input": "keyword: required search keyword; location: optional; max_pages: optional",
    },
    {
        "id": "coreclaw~youtube-channel-scraper",
        "name": "YouTube Channels",
        "version": "v1.0.2",
        "purpose": "Public YouTube channel data by channel URL, one URL per line in the form.",
        "input": "urls: list of public channel URLs",
    },
]

WORKER_IDS = {w["id"] for w in WORKERS}


def configured():
    return bool(os.environ.get("CORECLAW_TOKEN"))


def _request(method, path, body=None):
    token = os.environ.get("CORECLAW_TOKEN", "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": "Bearer " + token,
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:1000]
        raise RuntimeError(f"CoreClaw HTTP {e.code}: {detail}")


def _unwrap(payload):
    if isinstance(payload, dict):
        return payload.get("data", payload)
    return payload


def build_input(worker_id, query, location, limit, urls):
    if worker_id == "coreclaw~google-maps-scraper":
        return {
            "keywords": [query],
            "base_location": location or "",
            "max_results": limit,
            "lang": "en",
        }
    if worker_id == "coreclaw~instagram-profile-scraper":
        return {"profile_url": urls or [query]}
    if worker_id == "coreclaw~google-search-scraper":
        out = {"keyword": query}
        if location:
            out["location"] = location
        return out
    if worker_id == "coreclaw~youtube-channel-scraper":
        return {"urls": urls or [query]}
    return {"query": query}


def start_run(worker_id, custom_input):
    payload = _unwrap(
        _request(
            "POST",
            f"/workers/{worker_id}/runs",
            {"input": {"parameters": {"custom": custom_input}}, "is_async": True},
        )
    )
    if not isinstance(payload, dict):
        raise RuntimeError("CoreClaw run response was not an object.")
    run_id = (
        payload.get("run_id")
        or payload.get("runId")
        or payload.get("id")
        or ""
    )
    dataset_id = (
        payload.get("dataset_id")
        or payload.get("datasetId")
        or payload.get("defaultDatasetId")
        or ""
    )
    status = str(payload.get("status", "running"))
    return {"run_id": run_id, "dataset_id": dataset_id, "status": status, "raw": payload}


def get_run(run_id):
    payload = _unwrap(_request("GET", f"/runs/{run_id}"))
    if not isinstance(payload, dict):
        raise RuntimeError("CoreClaw run status was not an object.")
    dataset_id = (
        payload.get("dataset_id")
        or payload.get("datasetId")
        or payload.get("defaultDatasetId")
        or ""
    )
    return {
        "status": str(payload.get("status", "")),
        "dataset_id": dataset_id,
        "raw": payload,
    }


def get_dataset_items(dataset_id):
    payload = _unwrap(_request("GET", f"/datasets/{dataset_id}/items"))
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        items = payload.get("items")
        if isinstance(items, list):
            return items
        return [payload]
    return []


def _first(value):
    if isinstance(value, list):
        return str(value[0]) if value else ""
    if value is None:
        return ""
    return str(value)


def _first_link(value):
    return _first(value)


def map_item(item, worker_id, job_id, query, location):
    if not isinstance(item, dict):
        return None
    name = (
        item.get("title")
        or item.get("name")
        or item.get("channel_name")
        or item.get("username")
        or ""
    )
    name = str(name)
    address = str(item.get("address") or "")
    website = str(item.get("website") or item.get("official_website") or "")
    phone = str(item.get("phone") or item.get("phone_number") or "")
    source_url = (
        str(item.get("url") or item.get("google_maps_url") or item.get("link") or "")
    )
    if not source_url:
        source_url = website
    category = ""
    cats = item.get("primary_category") or item.get("category")
    if isinstance(cats, list):
        category = str(cats[0]) if cats else ""
    elif cats:
        category = str(cats)
    elif isinstance(item.get("all_categories"), list) and item["all_categories"]:
        category = str(item["all_categories"][0])
    rating = 0.0
    for key in ("review_rating", "rating"):
        try:
            if item.get(key) is not None:
                rating = float(item[key])
                break
        except (TypeError, ValueError):
            pass
    review_count = 0
    try:
        if item.get("review_count") is not None:
            review_count = int(item["review_count"])
    except (TypeError, ValueError):
        pass
    emails = item.get("all_emails") or item.get("emails") or []
    email = _first(emails) if isinstance(emails, list) else str(emails or "")
    if not email and isinstance(item.get("email"), str):
        email = item["email"]
    social = {
        "instagram": _first_link(item.get("instagram")),
        "facebook": _first_link(item.get("facebook")),
        "linkedin": _first_link(item.get("linkedin")),
        "youtube": _first_link(item.get("youtube")),
        "x": _first_link(item.get("twitter")),
    }
    loc = str(
        item.get("source_location")
        or item.get("location_text")
        or location
        or ""
    )
    if not loc and query:
        loc = query
    return {
        "source": "coreclaw",
        "source_url": source_url,
        "type": "business" if worker_id == "coreclaw~google-maps-scraper" else "profile",
        "name": name,
        "category": category,
        "location": loc,
        "address": address,
        "phone": phone,
        "website": website,
        "email": email,
        "email_source": "coreclaw_item" if email else "",
        "social_links": social,
        "rating": rating,
        "review_count": review_count,
        "verified": False,
        "verification_note": "",
        "collected_at": "",
        "job_id": job_id,
    }
