# TikTok Live Vote Counter

## What it is

A lightweight web app that counts audience votes from a TikTok Live chat in real time. Viewers “vote” by typing any word or phrase in chat. The app tallies those texts and shows live rankings during a timed round.

## Key features

Start / Stop controls

> Start a round with a 3-second countdown, stop at any time, or clear
> results manually.

Configurable timer

> Set the voting window in seconds (e.g., 60s). The app displays a live
> countdown.

Auto reset per round

> Starting a new round clears previous results automatically.

Live results table

> Sorted by vote count (highest first); the winner is announced when
> time expires.

Status & debug panel

> Shows connection status, last received message, and total messages
> seen.

Test Vote

> Inject test messages locally to validate the end-to-end flow even
> without an active live stream.

Polished UI

> Built with React + Tailwind v4 for a clean, responsive interface.

## How it works (architecture)

Server (Node.js):

> Uses tiktok-live-connector to connect to a specified TikTok username’s
> live room and listen for chat events. A WebSocket server (ws)
> broadcasts those events to all connected web clients.

Client (React):

> Connects to the server via WebSocket, receives chat messages, and
> counts votes only while a round is active (isCounting). The app
> handles countdowns, timers, and rendering the results table.

## Typical flow

1. Enter the TikTok username and desired duration (in seconds).
2. Click Connect to link the server to the TikTok live room.
3. Click Start: a 3-second on-screen countdown runs, then vote
   collection begins.
4. Viewers type messages in TikTok chat; each message counts as one
   vote for its full text. (Optional: you can switch to “first word only” in code.)
5. When the timer hits zero (or you click Stop), counting ends and the
   winner is shown.

## Tech stack

Frontend: React + Vite, Tailwind CSS v4 (@tailwindcss/vite)
Backend: Node.js, ws (WebSocket server), tiktok-live-connector
Transport: JSON over WebSocket

## Deployment

Build the React app (Vite → dist/), then serve it with the same Node server that also handles WebSocket on /ws. This keeps everything on one origin (avoids CORS/mixed-content issues) and works with HTTP or HTTPS (using ws:// or wss:// automatically).

## Configuration notes

The vote key defaults to the entire chat message (trimmed).
To count only the first word, switch to key = key.split(/\s+/)[0].

The client safeguards against React state “stale closures” by tracking isCounting with a ref, ensuring votes are counted as soon as a round begins.

The app logs raw and parsed WS messages to help diagnose connectivity.

Limitations / Requirements

TikTok chat access depends on the live being public and accessible in your region; otherwise no chat will arrive.

If the live room is offline, use Test Vote to verify the app’s end-to-end behavior.

Good next steps (optional)

Whitelisted options (only count predefined choices).

Emoji filtering / normalization.

Sound or visual effects on winner announcement.

Persisting results to a database or CSV.

Multi-round scoreboard.

Here you go—clean, English instructions you can drop into your README:

## How to Install and Run

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Open ports: **3000** (server) and **5173** (Vite dev) unless you customize them

### 1) Install

```bash
cd tiktok-vote-counter
npm i
```

### 2) Run (Development)

**Option A — Single server (recommended)**

```bash
node src/server.js
```

- Opens the app at: `http://localhost:3000`
- Serves the built client (if present) and a WebSocket endpoint at `/ws` on the same origin.

**Option B — UI dev server (for frontend-only work)**

```bash
npm run dev
```

- Opens the app at: `http://localhost:5173`
- If you use this mode, ensure the client’s WS URL points to your backend, e.g. `ws://localhost:3000/ws` (or set up a Vite proxy).

### 3) Build & Run (Production)

```bash
npm run build        # Produces static files in dist/
node src/server.js   # Serves dist/ and exposes WS at /ws
```

### 4) Environment / Configuration (optional)

- Change the server port:

```bash
PORT=8080 node src/server.js
```

- Username and duration are configured in the UI at runtime.

### 5) Quick Test

1. Open the app → click **Connect**.
2. Click **Start** → a 3-second countdown appears.
3. Use **Test Vote** in the UI to simulate chat messages if a real live stream isn’t available.

### 6) Troubleshooting

- **No messages in the UI:**

  - Check the server logs for `Connected to roomId ...` and `[CHAT] ...`.
  - Verify firewall/ports (Windows Firewall can block Node).
- **WS doesn’t connect:**

  - In DevTools → Network → WS, you should see a connection to `/ws`.
  - If serving the site over HTTPS, the client will use `wss://` automatically when the server and WS share the same origin.
- **Votes not incrementing after Start:**

  - Ensure the status shows “Counting…”.
  - Try **Test Vote** to confirm the end-to-end path.

### 7) Handy npm scripts (optional)

Add these to `package.json` for convenience:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node src/server.js",
    "serve": "npm run build && npm run start"
  }
}
```
