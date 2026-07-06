# DataMorph

A web application for large-scale CSV and Excel pattern matching and replacement. Users describe a pattern in plain English, an LLM converts it to a regex, and a distributed processing engine applies it across the file — all without blocking the UI.

---

## Demo

> Upload a CSV, describe what to find, watch it process in real time, and view paginated results.

**Live URL:** https://datamorph-frontend.vercel.app

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Choices & Reasoning](#technology-choices--reasoning)
- [Project Structure](#project-structure)
- [Local Development — Quick Start](#local-development--quick-start)
- [Running with Docker Compose](#running-with-docker-compose)
- [Production Deployment](#production-deployment)
- [Environment Variables Reference](#environment-variables-reference)
- [Async Stack Explained](#async-stack-explained)
- [Spark & Partitioning Rationale](#spark--partitioning-rationale)
- [LLM Integration](#llm-integration)
- [Identity Model](#identity-model)
- [Trade-offs & Notes](#trade-offs--notes)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Vercel)                                               │
│  React + Vite + Tailwind                                        │
│  • Generates X-Client-Id UUID (sessionStorage)                  │
│  • Attaches header to every request via Axios interceptor       │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS  X-Client-Id header
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Django REST API  (Railway — Waitress WSGI)                     │
│                                                                 │
│  POST /api/uploads/     → validate, save to volume, dispatch   │
│  GET  /api/uploads/:id/ → return metadata + column info        │
│  POST /api/jobs/        → create Job record, dispatch to Celery │
│  GET  /api/jobs/:id/    → poll status + progress (0–100 %)     │
│  GET  /api/jobs/:id/result/ → paginated Parquet rows           │
│  DELETE /api/uploads/:id/   → delete upload + associated jobs  │
└────────────────────────┬────────────────────────────────────────┘
                         │ enqueue task
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Redis  (Railway managed)                                       │
│  • Celery message broker                                        │
│  • Celery result backend                                        │
│  • LLM regex cache  (7-day TTL, keyed by SHA-256 of prompt)    │
└────────────────────────┬────────────────────────────────────────┘
                         │ task received
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Celery Worker  (same Railway service, shared volume)           │
│                                                                 │
│  inspect_upload_task                                            │
│    └─ reads uploaded file → extracts column names + row count  │
│                                                                 │
│  run_job_task                                                   │
│    ├─ calls Llama 3.1-8B via HuggingFace Inference API         │
│    ├─ validates + caches generated regex in Redis              │
│    ├─ runs pandas/PySpark replacement across target columns    │
│    └─ writes result to Parquet on shared Railway Volume        │
└────────────────────────┬────────────────────────────────────────┘
                         │ reads / writes
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Shared Storage                                                 │
│  • Railway Volume mounted at /app/media (uploads + results)    │
│  • Neon PostgreSQL (jobs, uploads, sessions, celery results)   │
└─────────────────────────────────────────────────────────────────┘
```

### Request lifecycle

1. User uploads a file → Django saves it to `/app/media/uploads/` and creates an `Upload` record (status: `PENDING`). Response returns immediately with `upload_id`.
2. Celery picks up `inspect_upload_task` → reads the file, extracts column metadata and row count, updates record to `READY`.
3. User configures columns, prompt, and replacement value → hits Run.
4. Django creates a `Job` record (status: `QUEUED`), dispatches `run_job_task` to Celery, and returns `job_id` immediately.
5. Celery worker calls the HuggingFace Inference API to convert the natural-language prompt to a regex (cached in Redis by prompt hash). Applies the regex across selected columns via pandas or PySpark. Writes result to Parquet. Updates `Job` to `SUCCESS`.
6. React frontend polls `GET /api/jobs/:id/` every 2 seconds, displaying a live progress bar.
7. On `SUCCESS`, the frontend fetches paginated rows from `GET /api/jobs/:id/result/`.

---

## Technology Choices & Reasoning

| Concern | Choice | Reason |
|---|---|---|
| Web framework | Django + DRF | Mature ORM, built-in sessions/admin, excellent async-task integration with Celery |
| WSGI server | Waitress | Pure Python, zero config files, deterministic bind behaviour — avoids the config-file ambiguity issues that affect Gunicorn |
| Task queue | Celery | Industry standard for Django async work; supports retries, backoff, cancellation, and progress reporting out of the box |
| Message broker | Redis (Railway) | Single service used as broker, result backend, and LLM cache — reduces infrastructure surface area |
| Database | Neon PostgreSQL | Serverless Postgres with a generous free tier; always-on (no sleep), scales to millions of rows |
| Data engine | PySpark (local mode) + pandas fallback | PySpark scales horizontally across partitions for large files; pandas is used locally and as a fallback when JVM memory is constrained |
| LLM | Llama 3.1-8B via HuggingFace Inference API | Free tier, no API key cost, abstracted behind LangChain so the model is swappable via an environment variable |
| LLM caching | Redis | Identical prompts never hit the model twice; 7-day TTL strikes a balance between freshness and cost |
| Frontend | React + Vite + Tailwind CSS v3 | Fast HMR, minimal configuration, utility-first styling |
| Frontend hosting | Vercel | Zero-config deployment for Vite projects, global CDN |
| Result format | Parquet | Columnar, compressed, fast to read arbitrary page slices — ideal for serving paginated results from large datasets |

---

## Project Structure

```
datamorph/
├── backend/
│   ├── backend/                  # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── celery.py             # Celery app definition
│   │   └── wsgi.py
│   ├── uploads/                  # File upload app
│   │   ├── models.py             # Upload model
│   │   ├── views.py              # Upload API views
│   │   ├── serializers.py
│   │   ├── validators.py         # MIME type + extension validation
│   │   └── storage.py            # Disk / R2 save logic
│   ├── jobs/                     # Job tracking app
│   │   ├── models.py             # Job model
│   │   ├── views.py              # Job API views (poll, result, cancel)
│   │   └── serializers.py
│   ├── processing/               # Async processing engine
│   │   ├── tasks.py              # Celery tasks (inspect_upload, run_job)
│   │   ├── llm.py                # LLM client + Redis caching
│   │   └── spark.py              # PySpark + pandas replacement engines
│   ├── core_utils.py             # X-Client-Id header helper
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .dockerignore
│   └── railway.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js          # Axios instance + client-id interceptor
│   │   ├── components/
│   │   │   ├── ui/               # Badge, Button, Card, ProgressBar, RegexPill, ConfirmModal
│   │   │   ├── upload/           # DropZone, FileRow
│   │   │   ├── configure/        # ColumnSelector, JobForm
│   │   │   ├── results/          # ResultsTable, Pagination
│   │   │   └── history/          # HistoryPanel
│   │   ├── screens/
│   │   │   ├── UploadScreen.jsx
│   │   │   ├── ConfigureScreen.jsx
│   │   │   └── ResultsScreen.jsx
│   │   ├── hooks/
│   │   │   └── useJobPoller.js   # Polling logic extracted into a hook
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── nginx.conf
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Development — Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Redis running locally (`brew install redis && brew services start redis`)
- Java 11+ (only required if `USE_SPARK=true`)

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and fill in values
cp ../.env.example .env

# Apply migrations
python manage.py migrate

# Start Django dev server
python manage.py runserver
```

In a second terminal, start the Celery worker:

```bash
cd backend
source .venv/bin/activate
celery -A backend worker --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`.

---

## Running with Docker Compose

Docker Compose brings up all services — Django, Celery, Redis, PostgreSQL, and the React frontend — with a single command.

```bash
# Copy the environment file and fill in required values
cp .env.example .env

# Build images and start all services
docker-compose up --build
```

After the first build, subsequent starts only need:

```bash
docker-compose up
```

**Service URLs:**

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Redis | localhost:6379 |
| PostgreSQL | localhost:5432 |

**Useful commands:**

```bash
# Stop all services
docker-compose down

# Stop and wipe all volumes (database + uploaded files)
docker-compose down -v

# View logs for a specific service
docker-compose logs -f web
docker-compose logs -f worker

# Rebuild after code changes
docker-compose up --build
```

**Note on PySpark in Docker:** The Docker build installs PySpark and Java automatically. Set `USE_SPARK=true` in your `.env` to use the real distributed engine. Leave it as `false` to use the pandas fallback (faster startup, lower memory).

---

## Production Deployment

The production stack uses fully managed cloud services:

| Component | Provider | Notes |
|---|---|---|
| Frontend | Vercel | Connected to GitHub, auto-deploys on push |
| Backend + Worker | Railway | Single service running both Waitress and Celery via shared process |
| Redis | Railway managed Redis | Used as Celery broker, result backend, and LLM cache |
| PostgreSQL | Neon | Serverless Postgres, always-on free tier |
| File storage | Railway Volume | Shared mount at `/app/media` accessible to both web and worker processes |

### Deploy to Railway

1. Push the repository to GitHub.
2. In Railway, create a new project → **Deploy from GitHub repo**.
3. Add a **PostgreSQL** plugin and a **Redis** plugin — Railway injects `DATABASE_URL` and `REDIS_URL` automatically.
4. Add a **Volume** mounted at `/app/media`.
5. Set the following environment variables (see [Environment Variables Reference](#environment-variables-reference)).
6. Set the start command:
   ```
   python manage.py migrate && waitress-serve --host=0.0.0.0 --port=8000 backend.wsgi:application & celery -A backend worker --loglevel=info --concurrency=1
   ```
7. Generate a public domain in Settings → Networking → Generate Domain.

### Deploy Frontend to Vercel

1. Import the GitHub repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Add environment variable: `VITE_API_URL=https://your-railway-url.up.railway.app`
4. Deploy.

---

## Environment Variables Reference

```bash
# Django
DJANGO_SETTINGS_MODULE=backend.settings
SECRET_KEY=                        # long random string — generate with: python -c "import secrets; print(secrets.token_urlsafe(50))"
DEBUG=False
ALLOWED_HOSTS=*

# Database
DATABASE_URL=                      # postgres://user:pass@host/db?sslmode=require

# Redis
REDIS_URL=                         # redis://default:pass@host:port

# LLM
HUGGINGFACE_API_KEY=               # hf_...
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct

# Processing engine
USE_SPARK=false                    # set to true in Docker / production for real PySpark

# CORS (set to your Vercel frontend URL)
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173

# Sessions
SESSION_COOKIE_SECURE=True         # must be True in production (HTTPS)
```

---

## Async Stack Explained

The web process never performs heavy work inline. The async architecture works as follows:

```
HTTP Request
    │
    ▼
Django view           ← validates input, creates DB record, returns immediately
    │
    │ .delay() / .apply_async()
    ▼
Redis (broker)        ← stores serialised task message
    │
    ▼
Celery worker         ← picks up message, executes task in a subprocess
    │
    ├─ updates Job.progress (0 → 100) via update_fields saves
    ├─ caches LLM output in Redis (SHA-256 keyed, 7-day TTL)
    └─ writes Parquet result to shared volume
    │
    ▼
React frontend        ← polls GET /api/jobs/:id/ every 2 seconds
                         renders live progress bar
                         fetches paginated results on SUCCESS
```

**Key properties:**

- **Non-blocking:** the web process is free to serve other requests while Celery works.
- **Retries with backoff:** both Celery tasks use exponential backoff (`2^n * 5` seconds) with a maximum of 3 retries.
- **Progress reporting:** `Job.progress` (0–100) is written to the database at each stage and polled by the frontend.
- **Cancellation:** `DELETE /api/jobs/:id/` calls `AsyncResult.revoke(terminate=True)` to stop the Celery task and marks the job `CANCELLED`.

---

## Spark & Partitioning Rationale

The core transformation uses PySpark's `regexp_replace` applied as a distributed DataFrame transformation:

```python
for col_name in target_columns:
    df = df.withColumn(
        col_name,
        F.regexp_replace(F.col(col_name).cast("string"), regex_pattern, replacement)
    )
```

**Why PySpark instead of pandas row iteration?**

Pandas applies operations row-by-row in a single Python process. PySpark splits the DataFrame into partitions and processes them in parallel across all available CPU cores. For a 1 million-row file:

- Pandas: single-threaded, memory-constrained, ~minutes
- PySpark local[*]: all cores in parallel, ~seconds

**Partitioning strategy:**

```python
num_partitions = (os.cpu_count() or 4) * 2
df = df.repartition(num_partitions)
```

`local[*]` instructs Spark to use all available CPU cores. Repartitioning to `cores × 2` ensures each core has work to do without creating too many small partitions. For CSV inputs Spark reads the file as a single partition by default; explicit repartitioning is required to parallelise.

**Result format — Parquet:**

Results are written as Parquet via `coalesce(1)` (single output file) rather than one file per partition. Parquet's columnar layout allows the API to read only the columns needed for pagination, and its compression significantly reduces storage for large text datasets.

**Pandas fallback:**

When `USE_SPARK=false`, an equivalent pandas implementation is used. The interface is identical — same function signature, same output path — so switching between engines is a one-line environment variable change.

---

## LLM Integration

Natural-language prompts are converted to regex patterns by Llama 3.1-8B via the HuggingFace Inference API, using LangChain as the abstraction layer.

### Prompt engineering

The system prompt uses Llama's native chat template format and includes concrete few-shot examples:

```
Input: find email addresses
Output: [a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}

Input: find names starting with J
Output: \bJ\w+(?:\s\w+)*\b
```

The model is instructed to return only the raw regex — no explanation, no markdown, no backticks.

### Response cleaning

The `_clean_response()` function handles common failure modes:

- Strips markdown code block fences
- Detects and extracts patterns from sed-style output (`s/pattern/replacement/flags`)
- Takes only the first non-empty line to discard explanatory text

### Validation

Before any pattern is applied to data, `_validate_regex()` checks:

1. The pattern is non-empty and under 500 characters.
2. It compiles without error under Python's `re` module.
3. It does not contain known catastrophic backtracking constructs (e.g. `(.*)+`).

### Caching

```python
cache_key = f"llm:regex:{sha256(prompt.lower().strip())[:16]}"
```

Every generated pattern is cached in Redis for 7 days. Identical prompts never reach the model.

---

## Authentication

There is no authentication in this app. For quick development authentication was not introduced, so the focus can be on designing and developing the main functionality. User identity is handled by a client-generated UUID sent as a custom HTTP header (`X-Client-Id`) on every request.

### How it works

**Frontend:** on first load, `crypto.randomUUID()` generates a UUID and stores it in `sessionStorage` under the key `datamorph_client_id`. An Axios request interceptor attaches it as `X-Client-Id` on every outbound request.

**Backend:** `core_utils.get_client_id(request)` reads `request.META.get("HTTP_X_CLIENT_ID")` and returns it. All upload and job queries filter by this value, which is stored in the existing `session_key` database column.

### Why not cookies?

The initial implementation used Django session cookies. When the frontend was deployed to Vercel and the backend to Railway, browsers blocked the session cookie due to `SameSite` cross-origin restrictions appearing in request logs. While Setting `SameSite=None; Secure` and configuring `CORS_ALLOW_CREDENTIALS` should have resolved the issue it kept generating new tokens on every request and broke the system logic.

The header-based approach is simpler, more reliable, and requires no cookie configuration on either side.

### Security trade-off

Anyone who knows a client's UUID can see their data. Adding real auth in future would be a one-line middleware change the `session_key` column would simply store a user ID instead of a client UUID, and the `get_client_id()` helper would be replaced with `request.user.id`. Alternatively, a stateless JWT-based authentication system could be introduced, where the user's identity is extracted from the validated JWT on each request. In either approach, the existing data access logic would remain largely unchanged, requiring only minimal modifications to how the client identifier is resolved.

---

## Trade-offs & Notes

**Shared process (web + worker):** In production, Waitress and Celery run in the same Railway service via a combined start command (`... & celery ...`). This simplifies deployment and enables the shared Railway Volume for file storage. The trade-off is that resource contention is possible under heavy load, a production-scale deployment would separate them into distinct services with dedicated resources and use S3/R2 for file storage.

**PySpark in local mode:** PySpark runs in `local[*]` mode, using all cores on a single machine. This is not a true distributed cluster for horizontal scaling across multiple machines, a Spark cluster (e.g. Databricks, EMR) would be required. For the scale described in the specification (millions of rows on a single machine), local mode with adequate memory is sufficient and avoids the operational complexity of a cluster. PySpark is resource heavy and so on a free account it was not possible to deploy it hence PySpark only runs whrn `USE_SPARK` in the env is set to `true`. Docker-compose with `USE_SPARK="true` on `.env` will run pyspark.

**No WebSockets:** Progress updates are delivered via polling (`GET /api/jobs/:id/` every 2 seconds) rather than WebSockets. For this use case where a job takes 2–30 seconds polling is simple and effective. WebSockets would add complexity without a meaningful UX improvement.

**Regex safety:** The LLM occasionally generates patterns with catastrophic backtracking potential. The validator catches the most common constructs, but it is not exhaustive. A production deployment should run regex matching in a separate subprocess with a timeout to fully isolate backtracking risks.

**File persistence:** Uploaded files and Parquet results are stored on a Railway Volume. If the service is redeployed or the volume is detached, files are lost. A production deployment should use object storage (S3, Cloudflare R2) for durability.

**Session identity scoping:** Each browser tab generates an independent client UUID (stored in `sessionStorage`). Multiple tabs open simultaneously will not share upload/job history. Closing a tab and reopening the app generates a new UUID, and previous uploads will not be visible. This was done intentionally, it mirrors session behaviour but differs from a logged-in user experience where history persists across sessions.
