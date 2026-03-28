# Operational Checklist & Guidelines (Crucix -> HF Space Monitor)

## 1. Pre-Flight Checklist
Before any deployment or major code modification, ensure the following checklist is executed:
- [ ] Understand the objective: We are shifting from a global OSINT aggregator to a Hugging Face Space monitor.
- [ ] Environment Setup: Ensure `HF_TOKEN` is present in `.env` and valid.
- [ ] Dependencies: Verify backend (FastAPI/Express) and frontend dependencies are installed.
- [ ] Tests: Run unit, integration, and E2E tests before committing.
- [ ] Linting & Formatting: Ensure code follows the project's style guide.

## 2. Architecture Guidelines
- **Backend Setup**: Use modular routing (FastAPI style or Express equivalent). Separate routes for `profiles`, `spaces`, `logs`, and `analysis`.
- **Dependency Injection**: Ensure services (e.g., Hugging Face API client, LLM provider) are injected into routers/controllers for testability.
- **State Management**: The backend must track and cache the state (running, paused, sleeping) of spaces and refresh every 30 minutes.
- **SSE Streams**: Container and build logs must be streamed to the client using Server-Sent Events (SSE). Do not buffer infinite logs in memory.

## 3. Deployment Steps
1. Verify `AGENTS.md` is updated.
2. Run full test suite.
3. Build frontend assets.
4. Start the backend server.
5. Verify cron jobs (30-minute sync) are initialized.
