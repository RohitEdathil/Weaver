# Weaver

A real-time, voice-driven AI that co-creates interactive **p5.js canvases** with you.

Talk to Weaver and it writes and edits a live sketch running in an embedded canvas —
then it looks at a screenshot of what it actually rendered and keeps iterating until
it looks right.

## How it works

- **Converser** — a voice agent on the Gemini Live API. You talk to it; it hands work
  off to the visualizer.
- **Visualizer** — an agent that writes/edits the canvas code. After each change it
  asks the browser for a screenshot, sees the result, and fixes its own mistakes.
- **Canvas** — agent-authored p5.js, rendered in a sandboxed iframe.

## Tech

- Backend: Python, FastAPI, Google ADK, Gemini
- Frontend: React, TypeScript, Vite
- Deploy: Google Cloud Run (backend) + Firebase Hosting (frontend)
- Storage: Firestore (saved artifacts)
