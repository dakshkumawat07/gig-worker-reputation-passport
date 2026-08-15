'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createPassportSigner } = require('../src/passportCrypto');
const { createPassportService } = require('../src/passportService');
const { createPassportStore } = require('../src/storage');

const VALID_INPUT = Object.freeze({
  workerId: 'worker-1001',
  workerName: 'Asha Sharma',
  jobsCompleted: 248,
  rating: 4.8,
  reliability: 96,
  skills: ['Delivery', 'Navigation', 'Customer Service'],
  issuingPlatform: 'Platform A'
});

function createTestContext(t) {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'gig-passport-test-')
  );

  t.after(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  const keysDirectory = path.join(temporaryDirectory, 'keys');
  const dataFile = path.join(temporaryDirectory, 'data', 'passports.json');
  const signer = createPassportSigner({ keysDirectory });
  const store = createPassportStore({ filePath: dataFile });
  const service = createPassportService({
    signer,
    store,
    clock: () => new Date('2026-08-15T18:30:00.000Z')
  });

  return {
    dataFile,
    keysDirectory,
    service,
    signer,
    store
  };
}

test('creates an Ed25519-signed passport and saves it to JSON storage', (t) => {
  const { service, signer, store } = createTestContext(t);
  const result = service.createPassport(VALID_INPUT);

  assert.equal(result.ok, true);
  assert.equal(result.passport.timestamp, '2026-08-15T18:30:00.000Z');
  assert.equal(typeof result.passport.signature, 'string');
  assert.equal(Buffer.from(result.passport.signature, 'base64').length, 64);
  assert.equal(signer.verify(result.passport), true);
  assert.deepEqual(store.readAll(), [result.passport]);
});

test('verification succeeds with the persisted public key after signer reload', (t) => {
  const { service, keysDirectory } = createTestContext(t);
  const passport = service.createPassport(VALID_INPUT).passport;
  const reloadedSigner = createPassportSigner({ keysDirectory });

  assert.equal(reloadedSigner.verify(passport), true);
});

test('verification rejects a modified rating', (t) => {
  const { service } = createTestContext(t);
  const passport = service.createPassport(VALID_INPUT).passport;
  const tamperedPassport = {
    ...passport,
    rating: 1.2
  };

  const result = service.verifyPassport(tamperedPassport);

  assert.equal(result.ok, true);
  assert.equal(result.valid, false);
});

test('verification rejects a modified skills list', (t) => {
  const { service } = createTestContext(t);
  const passport = service.createPassport(VALID_INPUT).passport;
  const tamperedPassport = {
    ...passport,
    skills: [...passport.skills, 'Unverified Skill']
  };

  const result = service.verifyPassport(tamperedPassport);

  assert.equal(result.ok, true);
  assert.equal(result.valid, false);
});

test('creation rejects invalid reputation values without saving a passport', (t) => {
  const { service, store } = createTestContext(t);
  const result = service.createPassport({
    ...VALID_INPUT,
    rating: 6,
    reliability: 110
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /rating must be between 0 and 5/);
  assert.match(result.errors.join(' '), /reliability must be between 0 and 100/);
  assert.deepEqual(store.readAll(), []);
});

test('verification rejects passport objects containing unsigned extra fields', (t) => {
  const { service } = createTestContext(t);
  const passport = service.createPassport(VALID_INPUT).passport;
  const passportWithExtraData = {
    ...passport,
    trustedByNewPlatform: true
  };

  const result = service.verifyPassport(passportWithExtraData);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /must contain exactly these fields/);
});
