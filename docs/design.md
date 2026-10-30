# Omnimerce Unified Scraper Module: Design

Date: 2026-10-30
Status: DESIGN ONLY, not built yet. Build starts only on milan's go-ahead.
Purpose: one module in Omnimerce where milan can run every type of scraping from one place, with one output format, and store the result in an Omnimerce endpoint.

This fits the Omnimerce AI layer already recorded: Lead Scraper feeding Marketing and CRM. It does not replace the ERP core. It feeds it.

## Honest limit, stated first

There is no single scraper code that scrapes every platform well. Each platform has a different page, login, rate limit, and block system.

So this module is not one scraper. It is one control panel, one job system, and one output format, with one adapter per source. A new source is a new adapter, not a rewrite of the whole module.

If a platform breaks or blocks, only that adapter stops. The rest keep working.

## What it covers

Phase 1, MVP:
1. Google Maps, business leads
2. YouTube, channels, videos, transcripts for public content
3. Instagram, public profiles and posts
4. General web, any public business website or directory page

Phase 2, after MVP is proven:
5. X (Twitter), public posts and profiles, with own account login only
6. Facebook, public Pages only
7. LinkedIn, public research only, see guardrail below

## Adapters, one per source

| Source | MVP method | Notes |
| Google Maps | gosom/google-maps-scraper, Go, Playwright, Docker | Best GitHub option found 2026-10-30. CLI, Web UI, REST API. About 120 results per search, split by area or keyword for more. |
| YouTube | YouTube Data API v3, plus yt-dlp for public transcripts where API does not give them | Official API first, because it is stable and legal for public data. |
| Instagram | Instaloader for public profiles, plus Instagram Graph API for own Business or Creator accounts | Instaloader needs care with rate limits and account risk. No private profiles. |
| General web | Playwright, plus Crawl4AI or Firecrawl style extraction for clean text and tables | For company sites, directories, and Impressum pages. |
| X | X API where possible, twscrape or Twikit as fallback, with own account only | Old tools like snscrape are dead. Account risk is real. |
| Facebook | Meta Graph API for own Pages, Apify Facebook Page actor as fallback | No private groups, no personal profiles. |
| LinkedIn | Public research adapter only | See LinkedIn guardrail. No automated LinkedIn scraping. |

## LinkedIn guardrail, standing rule

milan's standing rule from 2026-10-23 applies in this module, with no exception:

- No automated LinkedIn scraping.
- No guessed LinkedIn URLs, emails, or personal mobiles.
- A LinkedIn link is stored only if a public source actually shows that exact URL.
- Otherwise the row is marked: find on LinkedIn by name.
- Reason: LinkedIn detects automation and can restrict the account that owns the Omnimerce company page.

The LinkedIn adapter in this module is therefore a research helper, not a bulk scraper. It searches public web results, company sites, and press, and records only verified links.

## One unified output

Every adapter converts to the same record, so Marketing and CRM get one format:

```
{
  "source": "google_maps",
  "source_url": "https://www.google.com/maps/place/...",
  "type": "business",
  "name": "Example GmbH",
  "category": "Ecommerce",
  "location": "Berlin, Germany",
  "address": "",
  "phone": "",
  "website": "",
  "email": "",
  "email_source": "website_impressum",
  "social_links": {
    "instagram": "",
    "facebook": "",
    "linkedin": "",
    "youtube": "",
    "x": ""
  },
  "rating": 0,
  "review_count": 0,
  "verified": false,
  "verification_note": "",
  "collected_at": "2026-10-30T00:00:00Z",
  "job_id": ""
}
```

For posts and profiles, the same record uses `type: profile` or `type: post`, with title, text, date, likes, comments, and link fields. The core fields, source, source_url, verified, and job_id, never change.

Verification levels:
- Raw: scraped, not checked
- Enriched: website visited, email or phone added from a published page
- Verified: company site or Impressum confirms the contact, and the source URL is stored

## Job flow, in plain language

1. User creates a job: source, query, location, limit, and whether to enrich with email.
2. Module checks the job: is the source allowed, is the limit sane, is a proxy needed.
3. Adapter runs, with retries, delays, and proxy rotation.
4. Cleaner runs: dedupe by website domain and by Maps place_id or profile URL, drop empty rows, normalise phone and website.
5. AI helper runs, it does not invent data: it cleans text, scores fit, tags category, and flags duplicates. It never guesses an email or a link.
6. Result is stored in three places, in this order:
   a. Local database for the job, so it can be re-exported
   b. CSV and JSON export
   c. POST to the Omnimerce endpoint, see below
7. Job report shows: rows found, rows kept, rows dropped as duplicates, MB used, proxy cost estimate, and errors.

A plain language job is also supported, like the gosom AI Agent Skill: "Find dentists in Berlin with emails". The AI agent turns that into a job, asks only for missing essentials, runs a small validation scrape first, then the full job.

## Omnimerce endpoint storage

This is the connection milan asked for on 2026-10-30: Muse, and later this module, store their response in an Omnimerce endpoint by API.

Proposed contract, to be confirmed against the real Omnimerce backend:

```
POST /api/v1/muse-responses
Authorization: Bearer <key from Secure Vault, never in chat>
Content-Type: application/json

{
  "source": "omnimerce_scraper",
  "task": "lead_scrape_germany",
  "job_id": "",
  "created_at": "",
  "summary": "11 German ecommerce leads, public sources only",
  "content": "summary text",
  "data": []
}
```

Rules:
- API key goes through Secure Vault only.
- Every POST is logged with status code and record ID, if Omnimerce returns one.
- If the endpoint is down, the job is not lost. It stays in the local database and retries, and the user is told it is pending, not claimed as stored.
- If Omnimerce is built on Frappe or ERPNext, the same data can also map to a CRM Lead DocType, using milan's existing CRM lead fields and dedupe key scheme.

Endpoint details still needed from milan before this part can be tested:
- Base URL and exact path
- Auth type
- Expected fields, if the backend already has a fixed schema
- Which outputs to store: all jobs, or only leads, or only named tasks

## Proxy and cost tracking

- Proxy provider is configurable, not hardcoded. Evomi is the example used in the 2026-10-30 cost check: residential from $0.49 per GB on a monthly plan, $0.99 per GB pay as you go.
- 1 GB means data transferred, not time and not a fixed number of leads. It includes request plus response, including images and scripts if the browser loads them.
- Planning estimates from 2026-10-30, to be replaced by a real 100 lead test:
  - Basic Maps leads: about 1,000 per GB, range 700 to 2,000
  - Email enriched leads: about 250 to 400 per GB, because each business website is also visited
- The module shows MB used per job, so milan can see the real cost per lead for his niche, not a generic estimate.
- No proxy is used for a small test job, unless the source blocks it. Proxies are turned on by job size and by block rate.

## Tech stack, proposed

- Service: Python FastAPI, one Docker container, deployable on Coolify on milan's VPS, same pattern as gosom and other Coolify apps.
- Maps adapter: gosom Docker image, called by the service, not rewritten.
- Browser: Playwright with Chromium, shared browser pool, image blocking option to save GB.
- Queue: simple job table in PostgreSQL first, no heavy queue system until volume needs it.
- Storage: PostgreSQL for jobs and results, plus CSV and JSON export.
- UI: simple web UI first: New Job, Jobs list, Job detail, Export, Cost. No fancy dashboard in MVP.
- API: REST, with the same job create, list, detail, and download endpoints as gosom, plus a unified export endpoint.
- Auth for the module UI and API: API key, stored in Secure Vault, and a login for the UI if milan wants it.

Why FastAPI plus gosom, not a rewrite in one language: gosom is already the best Maps tool, and Python has the best adapters for Instagram, X, YouTube, and general web. Rewriting Maps in Python would lose time for no gain.

## Deployment

- Docker image, Coolify app, with volumes for job data and Playwright cache.
- Environment variables only for secrets: Omnimerce endpoint URL, Omnimerce API key, proxy credentials, YouTube API key, X API key.
- No secrets in code, no secrets in chat, no secrets in this design file.
- Logs show job status, not API keys and not private data.

## Phases and acceptance tests

Phase 0, design: this file. Done on milan's go-ahead to design, not a build claim.

Phase 1, MVP, about one focused build:
- Maps job works end to end: query, limit, CSV, JSON, dedupe, cost report
- YouTube job works: channel or search, videos list, export
- Instagram public profile job works: profile, recent posts, export
- General web job works: URL list, clean text and contact fields, export
- One POST test to a test Omnimerce endpoint, or to a local test receiver if the real endpoint is not ready, with status and record ID shown
- Acceptance: run a 100 lead Maps test, check MB used, check dedupe, check that every email row has a source URL, and check that the Omnimerce POST either succeeds with an ID or is honestly shown as pending

Phase 2, social expansion:
- X and Facebook adapters, with account risk warnings in the UI
- LinkedIn public research adapter, with the guardrail above enforced in code, not just in docs
- Scheduled jobs, only if milan asks for them. No auto sync by default, per his one time setup rule.

Phase 3, Omnimerce product fit:
- Direct CRM import, Marketing list creation, and Operation Bot command: "scrape X leads and save them to CRM"
- Lead scoring and fit tags from the AI layer, with no invented fields

## What milan needs to decide before build

1. MVP scope: Maps plus YouTube plus Instagram plus web, or full module with X and Facebook in the first build too?
2. Omnimerce endpoint: already built, or should the module store locally first and POST later when the endpoint is ready?
3. Hosting: use his existing VPS with Coolify, or a local test first?
4. LinkedIn: confirm the public research only rule still stands for this module.

## UI design: Metronic theme, update 2026-10-30

Yes, the Metronic theme is already on this VM, with one important limit.

What is here, verified 2026-10-30 in ~/workspace/metronics-deploy/:
- Metronic Tailwind React v9.5.0, Vite apps, demo and concept, with prebuilt dist folders and src folders.
- Concept src includes layouts for ai, calendar, crm, mail, real estate, store inventory, and todo, plus components, hooks, providers, and styles.
- Demo src includes auth, components, config, layouts, pages, and routing.

What is NOT complete:
- The Next.js version of the Concept app is missing 44 files, listed in ~/workspace/metronics-deploy/missing-files.txt. Those are store inventory dashboard and customer components, plus AI, calendar, CRM, mail, real estate, store inventory, and todo layout components.
- The Vite files cannot be copied into Next.js, because Vite components use react-router, react-router-dom, and react-helmet-async, which do not work under Next.js App Router.
- The theme.woodwolfdigital.com build was stalled on this missing file issue, with a decision prompt delivered 2026-10-29, and nothing changed until milan picks: get the files from the vendor, or authorise removal or stubbing.

Update 2026-10-30, verified from the new Drive upload: milan's new files metronic-tailwind-react-demos_v9.4.13.zip (121 MB, 9,287 files) and metronic-tailwind-react-concepts_v9.4.13.zip (143 MB, 7,846 files) are in ~/workspace/metronics-deploy/new-version-2026-10-30/, separate from the existing v9.5.0 copy, which was not overwritten. The concepts zip contains typescript/nextjs plus typescript/vite. Checked against ~/workspace/metronics-deploy/missing-files.txt, all 44 of 44 missing Next.js concept files are present in the new concepts zip, under metronic-tailwind-react-concepts/typescript/nextjs/, including all 12 store inventory files and all AI, calendar, CRM, mail, real estate, store inventory layout, and todo layout files. So the Next.js version is no longer incomplete in this new upload, even though 9.4.13 is an older version number than 9.5.0. This also unblocks the theme.woodwolfdigital.com Next.js build, which was stalled only on those files, but that rebuild still needs milan's go-ahead and is separate from the scraper setup.

Decision for the scraper module UI, based on that:
- Use the Metronic Tailwind React Vite version from the new v9.4.13 upload for the scraper UI, because a Vite static build fits behind FastAPI, and the Next.js version is now also complete in v9.4.13 if a Next.js frontend is chosen later.
- Use Metronic layout, sidebar, header, cards, tables, badges, buttons, and Keenicons, as they already exist in the prebuilt dist and src.
- Apply Omnimerce branding on top of Metronic structure: Omnimerce logo mark, primary #242424, AI accent #FF795B, background #FAF8F5, text #363636, from the Omnimerce brand file. Do not redraw the Omnimerce logo. Use the supplied master files only.
- Scraper module screens in Metronic layout:
  1. Dashboard: job stats cards, MB used, leads per GB, recent jobs table
  2. New Job: source selector, query, location, limit, email enrichment toggle, proxy toggle, in a Metronic card form
  3. Jobs list: Metronic table with status badge, source, rows found, rows kept, MB, cost, actions for CSV, JSON, and Omnimerce POST status
  4. Job detail: results table with verification badge Raw, Enriched, or Verified, source URL link, dedupe note, and export buttons
  5. Settings: Omnimerce endpoint URL, API key field, proxy provider, and cost limits, with secrets masked
- No new UI framework is introduced for this module. Metronic Tailwind React is the UI, FastAPI is the API behind it, gosom and other adapters are the workers.

No build, no deployment, and no endpoint POST will happen until he picks scope in point 1.

## Metronic UI implementation, 2026-10-30, live

Method used, chosen for reliability in Coolify Docker: a static frontend served by FastAPI, using real vendor compiled Metronic CSS, not a lookalike stylesheet and not a full React rebuild.

Source, verified by zip listing, not re-derived:
- Metronic Tailwind React v9.4.13, from ~/workspace/metronics-deploy/new-version-2026-10-30/, which milan uploaded via Drive. The existing v9.5.0 copy was not overwritten, and no Next.js files were copied into this repo.
- Concepts Vite prebuilt CSS: metronic-tailwind-react-concepts/typescript/vite/dist/assets/index-BmpQ7Hib.css, copied verbatim to frontend/assets/metronic.css, MD5 verified against the zip extract. This CSS provides Metronic demo1 layout variables, sidebar width 280px, header height 70px, sidebar, header, table, container, and Tailwind utilities used by the page.
- Keenicons outline, from the demos Vite source, because the concepts Vite dist has no Keenicons font files: metronic-tailwind-react-demos/typescript/vite/src/components/keenicons/assets/outline/style.css, copied verbatim to frontend/assets/keenicons/outline/style.css, with its fonts keenicons-outline.ttf, keenicons-outline.woff, and keenicons-outline.svg in frontend/assets/keenicons/outline/fonts/, so the font URLs in style.css resolve without edits.
- Omnimerce overlay: frontend/assets/omnimerce.css is the only new stylesheet, and it is labelled as an overlay, not Metronic. It sets only Omnimerce colours #242424, #FF795B, #FAF8F5, #363636, sidebar background, button hover, badge colours, table cell padding, and a hidden view class. No Omnimerce logo was redrawn, the header uses a text wordmark.
- Markup: Metronic demo1 layout pattern, sidebar with sidebar-header, sidebar-wrapper, sidebar-logo classes, header with header class, cards as white rounded bordered blocks using Metronic utilities, tables using the Metronic table class plus overlay cell padding, badges as rounded pills with overlay colours, Keenicons as ki-outline plus ki-element-11, ki-element-plus, ki-data, ki-setting-2, ki-chart-line, ki-shield-tick.
- What is not yet a full React component reuse: the page does not import Metronic React components, accordion menus, or dropdowns, because that would require a Node Vite build and the full concepts React dependency set. That remains a possible later step, and it is not claimed here.
- API behaviour unchanged: GET /health, POST /api/jobs, GET /api/jobs, GET /api/jobs/{id} are the same as before, jobs are in memory only, adapters are still stubs, MB and cost show as not measured, Omnimerce POST status shows as Not sent, and Settings are saved in the browser only, not on the server and not in the repo.

## Metronic UI v2, component match, 2026-10-30, supersedes the generic shell

Milan's update: do not use a generic Metronic shell. Use the concept and demo components that best match a scraper, adapted to scraper data, with no mock CRM companies and no fake leads.

Base files, all from Metronic Tailwind React v9.4.13, Vite, in the new upload, read in /tmp/metronic-survey, not copied as React code into this repo, because FastAPI serves a static frontend:
- Layout, Demos Demo1 light sidebar: src/layouts/demo1/layout.tsx, src/layouts/demo1/components/sidebar.tsx, src/layouts/demo1/components/header.tsx, src/layouts/demo1/components/sidebar-menu.tsx, src/layouts/demo1/components/sidebar-header.tsx, src/pages/dashboards/demo1/light-sidebar/demo1-light-sidebar-page.tsx, src/pages/dashboards/demo1/light-sidebar/demo1-light-sidebar-content.tsx. Used: body classes demo1, sidebar-fixed, header-fixed, sidebar plus wrapper plus header plus main grow pt-5 structure, light sidebar with bg-background and border, not dark sidebar, Toolbar heading plus actions pattern, grid gap-5 lg:gap-7 content pattern. The light sidebar content components channel-stats, highlights, and teams were reference only and were not copied, because their follower counts and team data would be fake for a scraper.
- Primary match, Concepts CRM: src/crm/pages/companies/company-list.tsx, src/crm/pages/companies/page.tsx, src/crm/pages/contacts/contact-list.tsx, src/crm/pages/deals/deal-list.tsx, src/crm/pages/companies/new-company-sheet.tsx, src/crm/pages/contacts/new-contact-sheet.tsx. Used: Company List and Contact List as the Leads view, with Card, CardHeader, search Input, DataGrid style table, Avatar initial fallback, source and verification Badges, and a footer count. Companies means business type records, Contacts means profile type records, All means both. Deal List as the Jobs pipeline cards, with stage Badge, Avatar initial, title, status Badge, created date, and View action, repurposed so stage is job source and title is job query. New Company Sheet and New Contact Sheet as the New Job right side sheet, with SheetHeader border, SheetBody form labels and inputs, and SheetFooter Cancel and Create actions, repurposed for source, query, location, limit, email toggle, and proxy toggle.
- Dashboard match, Concepts Store Inventory: src/store-inventory/pages/dashboard/page.tsx, src/store-inventory/pages/dashboard/components/inventory-summary.tsx, src/store-inventory/pages/dashboard/components/sales-activity.tsx, src/store-inventory/pages/dashboard/components/orders.tsx, src/store-inventory/pages/dashboard/components/product-stock.tsx, src/store-inventory/pages/dashboard/components/inventory.tsx, src/store-inventory/pages/tables/customer-list.tsx, src/store-inventory/pages/tables/order-list.tsx, plus recent-orders table pattern. Used: dashboard grid xl:grid-cols-3 then lg:grid-cols-3, Orders card repurposed as Jobs run, Inventory card repurposed as Leads kept with verified versus raw bar and source counts, Best Seller card repurposed as Top source, Sales Activity card repurposed as Job performance with completed, leads kept, failed, pipeline progress, and recent activity from real jobs only, Product Stock card repurposed as wide Results table, recent orders table repurposed as Recent jobs table.
- Job status match, Concepts Todo: src/todo/pages/today/stats-cards.tsx, src/todo/pages/today/task-list.tsx, src/todo/pages/upcoming/stats-cards.tsx, src/todo/pages/upcoming/task-list.tsx, src/todo/pages/completed/stats-cards.tsx, src/todo/pages/completed/task-list.tsx. Used: stats cards pattern, Card plus CardContent with icon in a rounded border circle, count, and label, repurposed as Jobs completed versus total, Jobs created, and Jobs failed. Task List pattern, Card plus CardHeader plus CardTitle, CardContent p-0 with divide-y rows, flex row with status dot, title, time, and Badge, repurposed as Job queue, with created_at as time and job status as Badge. No checkbox toggle, because jobs are not toggleable tasks. ProgressCircle from Todo stats cards was repurposed as a progress bar, because the static page does not include the React ProgressCircle component.
- Not used, as instructed: real estate map and card pages, mail inbox pages, calendar pages, and store-client checkout pages. No store-client shopping layout, no dark sidebar.
- CSS and icons, unchanged from v1: frontend/assets/metronic.css is the concepts Vite prebuilt CSS verbatim, frontend/assets/keenicons/outline/style.css plus fonts are demos Vite Keenicons outline verbatim, frontend/assets/omnimerce.css is the Omnimerce overlay only, with #242424, #FF795B, #FAF8F5, #363636, sheet positioning, avatar, dot, badge, and progress styles. No logo was redrawn, header uses a text wordmark.
- Empty states: Leads, Jobs, Dashboard, and pipeline all say No jobs yet or No leads yet when the API returns empty results, with no mock companies, no mock contacts, and no mock deals.
