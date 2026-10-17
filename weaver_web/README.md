# weaver_web

Single-page React frontend for Weaver. On load it creates a backend session and
embeds the session's canvas (an agent-editable p5.js document) in an iframe.

## Setup

```bash
npm install
cp .env.example .env   # optional; defaults to http://localhost:8000
```

## Run

Start the backend (from the `weaver/` directory):

```bash
uv run fastapi dev weaver/app.py
```

Then start the frontend:

```bash
npm run dev
```

Open http://localhost:5173.

## Configuration

| Variable       | Default                 | Description          |
| -------------- | ----------------------- | -------------------- |
| `VITE_API_URL` | `http://localhost:8000` | Weaver backend base. |

The canvas is untrusted agent-authored HTML and is served with a
`Content-Security-Policy: sandbox` header.

## Scripts

- `npm run dev` – dev server with HMR
- `npm run build` – typecheck + production build
- `npm run lint` – oxlint
- `npm run preview` – preview the production build
