# Boardroom AI — Frontend

The client for **Boardroom AI**: watch four AI executives — CEO, CFO, CTO, and CMO — debate a business problem live, then get a structured action plan and a generated timeline chart.

Built with **React** + **Vite**, styled with Tailwind, backed by **Supabase** for auth and **a FastAPI backend** for the actual debate/planning pipeline.

**Live demo:** https://boardroom-ai-frontend.vercel.app/

## Features

- **Guest mode** — try it instantly with your own Groq API key, no account, nothing persisted beyond the browser session.
- **Authenticated mode** — sign in (email/password or Google) and your sessions are saved and browsable in a history sidebar.
- **Encrypted key storage** — for signed-in users, the Groq API key is stored via Supabase Vault (`get_groq_key`/`save_groq_key` RPCs), not in plaintext anywhere in the database.
- **Live debate streaming** — executive responses appear one at a time as the backend generates them, over Server-Sent Events.
- **Cold-start awareness** — the backend runs on free-tier hosting that spins down when idle; the app pings a health endpoint first and shows a "waking up the server" message instead of leaving you staring at nothing for up to a minute.

## Getting started

```bash
npm install
npm run dev
```

### Environment variables

Create a `.env` (see `.gitignore` — it's excluded from version control):

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key. |
| `VITE_BACKEND_URL` | URL of the FastAPI backend (e.g. `http://localhost:8000` locally, or your deployed Render URL). |

On Vercel, set these under **Project Settings → Environment Variables** — `VITE_*` variables are baked in at *build* time, so changing them requires a fresh deploy, not just a restart.

## Project structure

- `App.jsx` — session/auth state, guest mode, Groq key onboarding flow.
- `components/Auth.jsx` — sign in / sign up / Google OAuth / guest entry.
- `components/GroqOnboarding.jsx` — first-run modal for providing a Groq API key.
- `components/Dashboard.jsx` — the main app: problem input, live debate stream, action plan + chart display, and session history.
- `lib/supabaseClient.js` — Supabase client init.

## Deployment

Deployed on Vercel. Make sure the backend's `FRONTEND_URL` (CORS allowlist) matches this app's deployed origin exactly — including no trailing slash mismatch — or requests will be blocked by CORS at the browser before they ever reach the API.
