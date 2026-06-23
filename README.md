# IAlestra Control Hub — Frontend

The command center for a multi-tenant AI agent marketplace. A React + TypeScript
console for configuring agents, running them, and governing consumption,
security, and access — built to match the FastAPI backend in `../backend`.

![dark control-room UI](public/favicon.svg)

## Highlights

- **Dark "control-room" design system** — layered navy-slate surfaces, an
  indigo→violet glow signal, cyan telemetry accents, and a signature conic
  **token-consumption gauge**. Type pairing: Space Grotesk (display) · Geist
  (UI) · JetBrains Mono (telemetry).
- **Deeply built core flows**
  - **Auth** — split sign-in with the backend's real password policy in mind.
  - **Dashboard** — live consumption chart, radial allotment gauge, model split,
    agent leaderboard, health strip, 7/30/90-day ranges.
  - **Agents** — searchable/filterable marketplace, per-agent gradient sigils,
    create/edit drawer (prompt, model, temperature, tools, output types),
    versioning on every save.
  - **Chat** — streaming execution UI with agent picker, token-by-token
    rendering, markdown output, stop control, and per-message token accounting.
- **Working module screens** — Users, Groups, Tools, Security Panel, Audit Logs.
- **Roadmap screens** — Knowledge Base, Templates, Billing, Tenant (scaffolded).
- **Command palette** (`⌘K` / `Ctrl+K`), notifications, toasts, responsive
  down to mobile, keyboard focus, and reduced-motion support.

## Backend contract

The client speaks the backend's exact conventions (`app/core/responses.py`):

```jsonc
// success
{ "success": true, "data": { /* ... */ }, "message": "..." }
// paginated
{ "success": true, "data": [ /* ... */ ], "pagination": { /* ... */ }, "message": "..." }
```

Routes are versioned under `/api/v1/*`, auth is JWT bearer, and lists are
paginated (`page`, `page_size`, max 100) — all mirrored in `src/lib/api`.

## Mock vs. live backend

The backend module routers are still being wired up (only `/health` is live), so
the console ships with a **seeded in-memory mock backend** and is fully usable
today. Flip one flag to point at the real API.

```bash
cp .env.example .env.local
```

| `VITE_USE_MOCK` | Behavior                                                       |
| --------------- | -------------------------------------------------------------- |
| `true` (default)| In-memory mock with realistic Alestra Telecom data.            |
| `false`         | Calls the live FastAPI backend, proxied to `VITE_API_TARGET`.  |

As each backend module router goes live, no frontend change is needed beyond the
flag — the endpoint functions in `src/lib/api/endpoints.ts` already target the
documented routes.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Demo credentials (mock mode): `maria.fuentes@alestra.com` · `Control$Hub1`

```bash
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

## Project structure

```
src/
├─ lib/api/          API client, types, endpoints, and the mock backend
│  ├─ client.ts      mock/live switch, envelope unwrapping, auth header
│  ├─ endpoints.ts   typed per-module API functions + chat streaming
│  ├─ types.ts       domain models mirroring the backend
│  └─ mock/          seeded db + request router + chat simulator
├─ store/            Zustand stores (auth, ui)
├─ components/
│  ├─ ui/            primitives: Button, Field, Badge, Modal, Toast, Sigil…
│  ├─ charts/        RadialGauge (signature), area/bar/sparkline
│  └─ layout/        AppShell, Sidebar, Topbar, CommandPalette, nav
├─ features/         deep flows: auth, dashboard, agents, chat
└─ pages/            module screens + roadmap placeholders
```

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query ·
Zustand · Recharts · Framer Motion · lucide-react.
