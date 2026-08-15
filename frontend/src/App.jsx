import { useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const DEMO_WORKER = {
  workerId: 'worker-1001',
  workerName: 'Asha Sharma',
  jobsCompleted: 248,
  rating: 4.8,
  reliability: 96,
  skills: ['Delivery', 'Navigation', 'Customer Service'],
  issuingPlatform: 'Platform A',
}

const STEPS = ['Worker Stats', 'Issue Passport', 'Verify', 'Tamper & Re-verify']

function stageToStepIndex(stage) {
  if (stage === 'stats') return 0
  if (stage === 'issued') return 1
  if (stage === 'verified') return 2
  return 3 // tampered
}

function short(sig) {
  if (!sig) return ''
  return `${sig.slice(0, 28)} … ${sig.slice(-16)}`
}

export default function App() {
  const [stage, setStage] = useState('stats') // stats -> issued -> verified -> tampered
  const [passport, setPassport] = useState(null)
  const [verifyResult, setVerifyResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function callApi(path, body) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.details?.join(', ') || data?.error || `Request failed (${res.status})`)
      }
      return data
    } catch (err) {
      const msg =
        err instanceof TypeError
          ? `Could not reach the backend at ${API_URL}. Is "npm start" running in /backend?`
          : err.message
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function handleIssue() {
    try {
      const created = await callApi('/api/passport', DEMO_WORKER)
      setPassport(created)
      setVerifyResult(null)
      setStage('issued')
    } catch {
      /* error already set */
    }
  }

  async function handleVerify(passportToSend) {
    try {
      const result = await callApi('/api/passport/verify', passportToSend)
      setVerifyResult(result)
      setStage(result.valid ? 'verified' : 'tampered')
    } catch {
      /* error already set */
    }
  }

  function handleTamper() {
    const tamperedPassport = { ...passport, rating: 2.0 }
    setPassport(tamperedPassport)
    handleVerify(tamperedPassport)
  }

  function handleReset() {
    setStage('stats')
    setPassport(null)
    setVerifyResult(null)
    setError(null)
  }

  const stepIndex = stageToStepIndex(stage)
  const isTampered = stage === 'tampered'

  return (
    <div className="shell">
      <div className="brand">
        <div className="brand-mark">GP</div>
        <div>
          <h1>GigPass</h1>
          <div className="tag">Portable cryptographic reputation passport for gig workers</div>
        </div>
      </div>
      <p className="subtitle">
        PS-10 demo: a worker's reputation is signed once by an issuing platform, then any
        other platform can verify it instantly — and any tampering with the signed data
        breaks verification.
      </p>

      <div className="stepper">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`step ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}
          >
            <span className="num">{i < stepIndex ? '✓' : i + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* Worker profile — always visible */}
      <div className="card">
        <h2>Worker profile</h2>
        <p className="desc">Simulated reputation record held by the issuing platform.</p>

        <div className="worker-head">
          <div className="avatar">AS</div>
          <div>
            <div className="worker-name">{DEMO_WORKER.workerName}</div>
            <div className="worker-id">{DEMO_WORKER.workerId} · {DEMO_WORKER.issuingPlatform}</div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="label">Jobs completed</div>
            <div className="value">{DEMO_WORKER.jobsCompleted}</div>
          </div>
          <div className="stat">
            <div className="label">Rating</div>
            <div className="value">★ {DEMO_WORKER.rating}</div>
          </div>
          <div className="stat">
            <div className="label">Reliability</div>
            <div className="value">{DEMO_WORKER.reliability}%</div>
          </div>
        </div>

        <div className="skills">
          {DEMO_WORKER.skills.map((s) => (
            <span className="pill" key={s}>{s}</span>
          ))}
        </div>

        {stage === 'stats' && (
          <button className="btn btn-primary" onClick={handleIssue} disabled={loading}>
            {loading && <span className="spinner" />}
            Issue Signed Passport →
          </button>
        )}
      </div>

      {/* Digital passport */}
      {passport && (
        <div className="card">
          <h2>Digital passport</h2>
          <p className="desc">Signed by Platform A's Ed25519 private key. Sent to Platform B for verification.</p>

          <div className={`sig-block ${isTampered ? 'invalid' : ''}`}>
            <div className="sig-label">
              <span>Ed25519 signature</span>
              <span>{isTampered ? 'unchanged' : 'issued'}</span>
            </div>
            <div className="sig-value">{short(passport.signature)}</div>
          </div>

          <div className="field-row">
            <span className="k">Rating (signed field)</span>
            <span className={`v ${isTampered ? 'struck' : ''}`}>
              {isTampered ? (
                <>4.8 → 2.0</>
              ) : (
                passport.rating
              )}
            </span>
          </div>
          <div className="field-row">
            <span className="k">Jobs completed</span>
            <span className="v">{passport.jobsCompleted}</span>
          </div>
          <div className="field-row">
            <span className="k">Issued</span>
            <span className="v">{new Date(passport.timestamp).toLocaleString()}</span>
          </div>

          {stage === 'issued' && (
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={() => handleVerify(passport)} disabled={loading}>
                {loading && <span className="spinner" />}
                Verify on Platform B →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {verifyResult && (
        <div className="card">
          <h2>Platform B verification result</h2>
          <p className="desc">Result returned live by the backend's signature check — nothing here is simulated in the browser.</p>

          <div className={`result ${verifyResult.valid ? 'valid' : 'invalid'}`}>
            <div className="result-icon">{verifyResult.valid ? '✓' : '✕'}</div>
            <div>
              <div className="result-title">
                {verifyResult.valid ? 'Reputation Verified' : 'Invalid / Tampered'}
              </div>
              <div className="result-msg">{verifyResult.message}</div>
            </div>
          </div>

          <div className="btn-row">
            {stage === 'verified' && (
              <button className="btn btn-danger" onClick={handleTamper} disabled={loading}>
                {loading && <span className="spinner" />}
                Simulate tampering (rating → 2.0)
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleReset}>
              Reset demo
            </button>
          </div>

          {isTampered && (
            <p className="hint">
              The signature was issued for rating 4.8. Changing the rating to 2.0 without
              re-signing breaks the signature check — proving the data can't be silently
              edited after issuance.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
