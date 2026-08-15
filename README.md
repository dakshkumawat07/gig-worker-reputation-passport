# GigPass — Gig-Worker Portable Reputation Passport

**PS-10 · Craft N Code Rajasthan 2026 · Manipal University Jaipur**

A cryptographically signed, platform-agnostic reputation credential that lets a gig worker carry their verified work history — completion rate, ratings, reliability — from one platform to another, with tamper-evident integrity built in.

## Problem

Gig workers build reputation inside a single platform. When they move to a new one, that history doesn't travel with them — they start from zero, and platforms have no reliable way to trust reputation data claimed from elsewhere.

## Our approach

An issuing platform (**Platform A**) signs a worker's reputation snapshot with an Ed25519 private key. Any other platform (**Platform B**) can independently verify that signature using the public key — no shared database, no manual trust, no way to silently edit the numbers after issuance. Change a single signed field and verification fails immediately.

## How it works

```
 Worker reputation data
        │
        ▼
 Platform A (Issuer)
  - builds passport JSON
  - signs it with Ed25519 private key
        │
        ▼
 Signed Passport  { …data, timestamp, signature }
        │
        ▼
 Platform B (Verifier)
  - re-derives the signed payload
  - checks signature against Platform A's public key
        │
        ▼
   valid: true / false
```

If any signed field (rating, jobs completed, reliability, etc.) is changed after issuance, the signature no longer matches and verification returns `valid: false` — this is demonstrated live in the app via a **Simulate Tampering** step.

## Demo flow

1. **Worker profile** — a simulated reputation record (Asha Sharma, 248 jobs, 4.8★, 96% reliability).
2. **Issue Signed Passport** — Platform A signs the record via the backend's `POST /api/passport`.
3. **Verify on Platform B** — the passport is sent to `POST /api/passport/verify`; result: ✅ **Reputation Verified**.
4. **Simulate tampering** — the rating is changed from 4.8 to 2.0 without re-signing, then re-verified; result: ❌ **Invalid / Tampered**.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Signing | Node.js built-in `crypto`, Ed25519 |
| Storage | Local JSON file (hackathon-scope, single process) |

## Project structure

```text
.
├── backend/
│   ├── src/                  # Express app, signing, storage, validation
│   ├── test/                 # Automated tests (10 passing)
│   ├── data/passports.json   # Local passport store
│   └── keys/                 # Ed25519 keypair, generated on first run (gitignored)
├── frontend/
│   └── src/                  # React app — worker profile, issue/verify/tamper flow
└── README.md
```

## Running it locally

Requires Node.js 18+. Two terminals, both left running.

**Terminal 1 — backend:**
```bash
cd backend
npm install
npm start
```
Runs at `http://localhost:5000`. On first run it generates an Ed25519 keypair in `backend/keys/`.

**Terminal 2 — frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open `http://localhost:5173`.

## API summary

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/passport` | `POST` | Signs and stores a new reputation passport |
| `/api/passport/verify` | `POST` | Verifies whether a passport's signature is still valid |

Full request/response contract: [`backend/README.md`](./backend/README.md).

## Testing

```bash
cd backend
npm test      # 10 automated tests: signing, verification, tamper rejection, HTTP layer
npm run check # syntax check across all source files
```

## Current scope & roadmap

This is a hackathon P0 build. It proves the cryptographic integrity mechanism end-to-end with one issuing platform and one demo worker record. Not yet built, and the natural next steps:

- Real API integrations with multiple gig platforms (currently one simulated issuer)
- Consent flow for the worker to authorize data sharing between platforms
- Issuer authentication (currently any caller can request a signed passport from the demo backend)
- Key rotation and revocation
- Persistent, concurrent-safe storage (currently a local JSON file, single-process)

## Team

**Daksh Kumawat** — Computer Science Engineering, Manipal University Jaipur
GitHub: [@dakshkumawat07](https://github.com/dakshkumawat07)

## Status

✅ P0 MVP complete — signed passport issuance, verification, and live tamper detection working end-to-end.
