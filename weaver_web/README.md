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

## Saving canvases with Firebase

The **Save artifact** button in the top bar saves the current canvas code to
Firestore; the **Saved** tab lets you reopen or delete artifacts later. There is
**no sign-in**: saves are grouped under a random per-browser id kept in
`localStorage`. It is optional — leave the Firebase env vars unset and the app
runs normally with saving disabled.

### One-time Firebase setup

1. Create a project in the [Firebase console](https://console.firebase.google.com/).
2. **Firestore Database** → create a database (start in production mode).
3. **Project settings → General → Your apps** → add a **Web** app and copy the
   config values into `weaver_web/.env` (see `.env.example`).
4. Deploy the security rules from the repo root (the project is pinned in
   `.firebaserc`):

   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules
   ```

### How it works

- Canvases are stored in a top-level `canvases` collection; each document has a
  `deviceId` field plus `title`, `code`, `sessionId` and timestamps. Keeping it
  flat (rather than nesting under a device path) means every save is visible at
  the Firestore console root.
- The first **Save artifact** creates a new document; after that the button
  becomes **Update artifact** and rewrites the same document in place.
- **Load** in the Saved tab writes the saved code back into the current session
  via `PUT /session/{id}/code`, so the agent keeps editing the loaded canvas.

> ⚠️ **Security:** `firestore.rules` allows anyone to read and write the
> `canvases` collection. The `deviceId` field keeps browsers apart in the UI but
> is not a security boundary — treat saved canvases as public until real
> authentication is added.

## Scripts

- `npm run dev` – dev server with HMR
- `npm run build` – typecheck + production build
- `npm run lint` – oxlint
- `npm run preview` – preview the production build
