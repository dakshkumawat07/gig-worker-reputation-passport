'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

let expressAvailable = true;
try {
  require.resolve('express');
} catch {
  expressAvailable = false;
}

test(
  'POST /api/passport creates a passport and POST /api/passport/verify detects tampering',
  { skip: expressAvailable ? false : 'Run npm install to enable the Express HTTP integration test.' },
  async (t) => {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'gig-passport-http-test-')
    );

    t.after(() => {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    const { createApp } = require('../src/app');
    const app = createApp({
      keysDirectory: path.join(temporaryDirectory, 'keys'),
      dataFile: path.join(temporaryDirectory, 'data', 'passports.json'),
      clock: () => new Date('2026-08-15T18:30:00.000Z')
    });

    const server = app.listen(0);
    t.after(() => new Promise((resolve) => server.close(resolve)));

    await new Promise((resolve) => server.once('listening', resolve));

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const input = {
      workerId: 'worker-1001',
      workerName: 'Asha Sharma',
      jobsCompleted: 248,
      rating: 4.8,
      reliability: 96,
      skills: ['Delivery', 'Navigation'],
      issuingPlatform: 'Platform A'
    };

    const createResponse = await fetch(`${baseUrl}/api/passport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    assert.equal(createResponse.status, 201);
    const passport = await createResponse.json();
    assert.equal(passport.workerId, input.workerId);
    assert.equal(typeof passport.signature, 'string');

    const validResponse = await fetch(`${baseUrl}/api/passport/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passport)
    });

    assert.equal(validResponse.status, 200);
    assert.equal((await validResponse.json()).valid, true);

    const tamperedResponse = await fetch(`${baseUrl}/api/passport/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...passport, jobsCompleted: 9999 })
    });

    assert.equal(tamperedResponse.status, 200);
    assert.equal((await tamperedResponse.json()).valid, false);
  }
);
