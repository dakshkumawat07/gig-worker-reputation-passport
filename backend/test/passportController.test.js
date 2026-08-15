'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createPassportController } = require('../src/passportController');

function createMockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    }
  };
}

test('create controller returns the signed passport with HTTP 201', () => {
  const expectedPassport = {
    workerId: 'worker-1001',
    workerName: 'Asha Sharma',
    jobsCompleted: 248,
    rating: 4.8,
    reliability: 96,
    skills: ['Delivery'],
    issuingPlatform: 'Platform A',
    timestamp: '2026-08-15T18:30:00.000Z',
    signature: 'test-signature'
  };

  const controller = createPassportController({
    createPassport: () => ({ ok: true, passport: expectedPassport })
  });
  const response = createMockResponse();

  controller.createPassport({ body: {} }, response, (error) => {
    throw error;
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, expectedPassport);
});

test('verify controller returns HTTP 200 and valid=false for tampering', () => {
  const controller = createPassportController({
    verifyPassport: () => ({ ok: true, valid: false })
  });
  const response = createMockResponse();

  controller.verifyPassport({ body: {} }, response, (error) => {
    throw error;
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.valid, false);
  assert.match(response.body.message, /modified/);
});

test('create controller returns HTTP 400 for invalid input', () => {
  const controller = createPassportController({
    createPassport: () => ({
      ok: false,
      errors: ['rating must be between 0 and 5.']
    })
  });
  const response = createMockResponse();

  controller.createPassport({ body: {} }, response, (error) => {
    throw error;
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'VALIDATION_ERROR');
});
