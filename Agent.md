# Agent.md

## 1. Deployment Configuration

### Target Space
- **Profile:** `AUXteam`
- **Space:** `Git-Auto-Deploy`
- **Full Identifier:** `AUXteam/Git-Auto-Deploy`
- **Frontend Port:** `7860` (mandatory for all Hugging Face Spaces)

### Deployment Method
Choose the correct SDK based on the app type based on the codebase language:

- **Docker SDK** — for all other applications (recommended default for flexibility)

### HF Token
- The environment variable **`HF_TOKEN` will always be provided at execution time**.
- Never hardcode the token. Always read it from the environment.
- All monitoring and log‑streaming commands rely on `HF_TOKEN`.

### Required Files
- `Dockerfile`
- `README.md` with Hugging Face YAML frontmatter:
  ```yaml
  ---
  title: HF Space Monitor
  sdk: docker
  app_port: 7860
  ---
  ```
- `.hfignore` to exclude unnecessary files
- This `Agent.md` file (must be committed before deployment)

---

## 2. API Exposure and Documentation

### Mandatory Endpoints
Every deployment **must** expose:

- **`/health`**
  - Returns HTTP 200 when the app is ready.
  - Required for Hugging Face to transition the Space from *starting* → *running*.

- **`/api-docs`**
  - Documents **all** available API endpoints.
  - Must be reachable at:
    `https://AUXteam-Git-Auto-Deploy.hf.space/api-docs`

### Functional Endpoints

### /api/state
- **Method:** GET
- **Purpose:** Fetch the current tracked state of all configured HF profiles and spaces.
- **Request:** None
- **Response Example:**
  ```json
  {
    "lastRefreshed": "2023-10-27T10:00:00.000Z",
    "isRefreshing": false,
    "spaces": { "huggingface": [ { "id": "huggingface/chat", "status": "RUNNING" } ] },
    "profiles": ["huggingface"]
  }
  ```

### /api/refresh
- **Method:** POST
- **Purpose:** Force a refresh of all tracked spaces across all profiles.
- **Request:** None
- **Response Example:**
  ```json
  { "success": true, "data": { ...state } }
  ```

### /api/refresh/:profile/:space
- **Method:** POST
- **Purpose:** Force a status refresh for a specific space.
- **Request:** Path parameters `profile` and `space`
- **Response Example:**
  ```json
  { "success": true, "data": { "runtime": { "stage": "RUNNING" } } }
  ```

### /api/analyze
- **Method:** POST
- **Purpose:** Analyze recent logs and README for a specific space using the configured LLM.
- **Request:**
  ```json
  { "profile": "huggingface", "space": "chat" }
  ```
- **Response Example:**
  ```json
  { "success": true, "analysis": "The space is running correctly..." }
  ```

### /api/spaces/:profile/:space/logs/run
- **Method:** GET
- **Purpose:** SSE stream for container run logs.
- **Request:** Path parameters `profile` and `space`
- **Response Example:** Server-Sent Events stream (text/event-stream)

### /api/spaces/:profile/:space/logs/build
- **Method:** GET
- **Purpose:** SSE stream for build logs.
- **Request:** Path parameters `profile` and `space`
- **Response Example:** Server-Sent Events stream (text/event-stream)

---

## 3. Deployment Workflow

### Standard Deployment Command
After any code change, run:

```bash
hf upload AUXteam/Git-Auto-Deploy --repo-type=space
```

This command must be executed **after updating and committing Agent.md**.

### Deployment Steps
1. Ensure all code changes are committed.
2. Ensure `Agent.md` is updated and committed.
3. Run the upload command.
4. Wait for the Space to build.
5. Monitor logs (see next section).
6. When the Space is running, execute all test cases.

### Continuous Deployment Rule
After **every** relevant edit (logic, dependencies, API changes):

- Update `Agent.md`
- Redeploy using the upload command
- Re-run all test cases
- Confirm `/health` and `/api-docs` are functional

This applies even for long-running projects.

---

## 4. Monitoring and Logs

### Build Logs (SSE)
```bash
curl -N \
  -H "Authorization: Bearer HF_TOKEN" \
  "https://huggingface.co/api/spaces/AUXteam/Git-Auto-Deploy/logs/build"
```

### Run Logs (SSE)
```bash
curl -N \
  -H "Authorization: Bearer HF_TOKEN" \
  "https://huggingface.co/api/spaces/AUXteam/Git-Auto-Deploy/logs/run"
```

### Notes
- If the Space stays in *starting* for too long, `/health` is usually failing.
- If the Space times out after ~30 minutes, check logs immediately.
- Fix issues, commit changes, redeploy.

---

## 5. Test Run Cases (Mandatory After Every Deployment)

### 1. Health Check
```
GET https://AUXteam-Git-Auto-Deploy.hf.space/health
Expected: HTTP 200, body: {"status": "ok"}
```

### 2. API Docs Check
```
GET https://AUXteam-Git-Auto-Deploy.hf.space/api-docs
Expected: HTTP 200, valid JSON spec documenting all endpoints
```

### 3. Functional Endpoint Tests
```
GET https://AUXteam-Git-Auto-Deploy.hf.space/api/state
Expected:
- HTTP 200
- JSON with keys "lastRefreshed", "spaces", "profiles"
```

```
POST https://AUXteam-Git-Auto-Deploy.hf.space/api/refresh
Expected:
- HTTP 200
- JSON with key "success": true
```

### 4. End-to-End Behaviour
- Confirm the UI loads at the root URL (/)
- Confirm API endpoints respond within reasonable time
- Confirm no errors appear in run logs

---

## 6. Maintenance Rules

- `Agent.md` must always reflect the **current** deployment configuration, API surface, and test cases.
- Any change to:
  - API routes
  - Dockerfile
  - Dependencies
  - App logic
  - Deployment method
  requires updating this file.
- This file must be committed **before** every deployment.
- This file is the operational contract for autonomous agents interacting with the project.
