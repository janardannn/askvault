# askvault

A tiny app that lets you find notes in your Obsidian vault by chatting in plain
language — powered by an [OpenRouter](https://openrouter.ai) model of your choice.

**It runs entirely in your browser. There is no server.** Your notes are read
locally by the browser and sent only to the model you pick (OpenRouter), using
your own key. Nothing — not your notes, not your key — ever passes through any
server of ours, because there isn't one. The deployed app is just static files.

## Guarantees

- **Read-only.** The browser requests `read` permission on your vault folder and
  the code only ever reads (`getFile`, never `createWritable`). There is no
  write/append/rename/delete path anywhere, and the model is given exactly three
  tools: `search_vault`, `list_notes`, `read_note`.
- **Scoped to one folder.** You pick your vault with the browser's folder picker;
  the app can only ever see inside that folder.
- **BYOK, encrypted locally.** You bring your own OpenRouter key. It's encrypted
  with a passphrase (Web Crypto: PBKDF2 → AES-GCM) and stored in `localStorage`.
  The passphrase is never stored; entering it is how you unlock. The key only
  ever leaves your browser to call OpenRouter directly.
- **Notes reach exactly one third party:** the model you chose. Never us.

## Requirements

A Chromium-based browser (**Chrome, Edge, Brave, or Arc**) — the
[File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_API)
is not available in Safari or Firefox.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, then:

1. Enter your OpenRouter key + a passphrase, and pick a model
   (default: `google/gemini-2.0-flash-exp:free` — any tool-capable model works).
2. Choose your Obsidian vault folder and grant read access.
3. Ask away. Next time, just enter your passphrase and re-confirm folder access.

## How it works

- `app/page.tsx` — unlock / setup / vault-pick flow.
- `app/components/Chat.tsx` — chat UI; runs the agent in-browser via the AI SDK's
  `DirectChatTransport` (no API endpoint).
- `lib/agent.ts` — `ToolLoopAgent` + OpenRouter, with the read-only tools.
- `lib/vault-browser.ts` — reads notes from the picked folder handle (read-only).
- `lib/crypto.ts` — encrypts/decrypts your key with your passphrase.
- `lib/store.ts` — localStorage (encrypted key) + IndexedDB (folder handle).

There are intentionally no API routes. `npm run build` produces a fully static app.
