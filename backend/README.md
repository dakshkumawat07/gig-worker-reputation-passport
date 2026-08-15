# Gig Worker Reputation Passport — P0 Backend

Minimal Node.js + Express backend for the Craft N Code Rajasthan 2026 PS-10 MVP.

It creates a signed reputation passport, stores it in a local JSON file, and verifies whether any signed field has changed.

## Stack

- Node.js 18+
- Express
- Node.js built-in `crypto`
- Local JSON storage
- Ed25519 digital signatures

## Project structure

```text
.
├── data/
│   └── passports.json
├── keys/
│   └── .gitkeep              # PEM keys are generated at first startup
├── src/
│   ├── app.js
│   ├── passportController.js
│   ├── passportCrypto.js
│   ├── passportService.js
│   ├── server.js
│   ├── storage.js
│   └── validation.js
├── test/
│   ├── http.integration.test.js
│   ├── passportController.test.js
│   └── passportService.test.js
├── .gitignore
├── package.json
└── README.md
```

## Run

```bash
npm install
npm start
```

The API starts at `http://localhost:5000` by default.

Optional environment variables:

```bash
PORT=5000
CORS_ORIGIN=http://localhost:5173
PASSPORT_KEYS_DIR=./keys
PASSPORT_DATA_FILE=./data/passports.json
```

On first startup, the backend generates one Ed25519 issuer key pair:

- `keys/issuer-private.pem`
- `keys/issuer-public.pem`

Keep the private key secret. Do not delete or replace the key pair if existing passports must continue to verify.

## API

### 1. Create a signed passport

`POST /api/passport`

Request:

```json
{
  "workerId": "worker-1001",
  "workerName": "Asha Sharma",
  "jobsCompleted": 248,
  "rating": 4.8,
  "reliability": 96,
  "skills": ["Delivery", "Navigation", "Customer Service"],
  "issuingPlatform": "Platform A"
}
```

Response: `201 Created`

```json
{
  "workerId": "worker-1001",
  "workerName": "Asha Sharma",
  "jobsCompleted": 248,
  "rating": 4.8,
  "reliability": 96,
  "skills": ["Delivery", "Navigation", "Customer Service"],
  "issuingPlatform": "Platform A",
  "timestamp": "2026-08-15T18:30:00.000Z",
  "signature": "BASE64_ED25519_SIGNATURE"
}
```

### 2. Verify a passport

`POST /api/passport/verify`

Send the complete passport returned by the create endpoint.

Valid response:

```json
{
  "valid": true,
  "message": "Passport signature is valid. The signed data has not been modified."
}
```

Tampered response:

```json
{
  "valid": false,
  "message": "Passport signature is invalid. The passport data or signature may have been modified."
}
```

## Test with curl

Create:

```bash
curl -X POST http://localhost:5000/api/passport \
  -H "Content-Type: application/json" \
  -d '{
    "workerId":"worker-1001",
    "workerName":"Asha Sharma",
    "jobsCompleted":248,
    "rating":4.8,
    "reliability":96,
    "skills":["Delivery","Navigation","Customer Service"],
    "issuingPlatform":"Platform A"
  }'
```

Copy the returned passport and send it unchanged to:

```bash
curl -X POST http://localhost:5000/api/passport/verify \
  -H "Content-Type: application/json" \
  -d '<PASTE_COMPLETE_PASSPORT_JSON_HERE>'
```

Then change a signed field such as `rating` or `jobsCompleted`, keep the old signature, and send it again. The endpoint should return `"valid": false`.

## Automated tests

```bash
npm test
npm run check
```

The tests cover successful signing, key persistence, JSON storage, validation, valid verification, modified-rating rejection, modified-skills rejection, unsigned-extra-field rejection, controller response codes, and the real HTTP endpoints after Express is installed.

## P0 assumptions

- `rating` uses a 0–5 scale.
- `reliability` uses a 0–100 percentage scale.
- A single issuer key pair represents the demo issuing backend.
- The JSON store is intended for a single-process hackathon demo, not concurrent production traffic.
- Verification uses this backend's persisted public key; replacing the key pair invalidates previously issued passports.
