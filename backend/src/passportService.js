'use strict';

const {
  parseCreatePassportInput,
  validateSignedPassport
} = require('./validation');

function createPassportService({ signer, store, clock = () => new Date() }) {
  if (!signer || typeof signer.sign !== 'function' || typeof signer.verify !== 'function') {
    throw new TypeError('A signer with sign() and verify() methods is required.');
  }

  if (!store || typeof store.save !== 'function') {
    throw new TypeError('A passport store with a save() method is required.');
  }

  function createPassport(input) {
    const parsedInput = parseCreatePassportInput(input);

    if (!parsedInput.ok) {
      return parsedInput;
    }

    const currentTime = clock();
    const timestamp =
      currentTime instanceof Date
        ? currentTime.toISOString()
        : new Date(currentTime).toISOString();

    const unsignedPassport = {
      ...parsedInput.value,
      timestamp
    };

    const passport = {
      ...unsignedPassport,
      signature: signer.sign(unsignedPassport)
    };

    store.save(passport);

    return {
      ok: true,
      passport
    };
  }

  function verifyPassport(passport) {
    const validation = validateSignedPassport(passport);

    if (!validation.ok) {
      return validation;
    }

    return {
      ok: true,
      valid: signer.verify(passport)
    };
  }

  return {
    createPassport,
    verifyPassport
  };
}

module.exports = {
  createPassportService
};
