'use strict';

const SIGNED_FIELDS = Object.freeze([
  'workerId',
  'workerName',
  'jobsCompleted',
  'rating',
  'reliability',
  'skills',
  'issuingPlatform',
  'timestamp'
]);

const PASSPORT_FIELDS = Object.freeze([...SIGNED_FIELDS, 'signature']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateNonEmptyString(value, fieldName, errors, maxLength = 120) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${fieldName} must be a non-empty string.`);
    return;
  }

  if (value.trim().length > maxLength) {
    errors.push(`${fieldName} must be at most ${maxLength} characters.`);
  }
}

function validateFiniteNumber(value, fieldName, errors, minimum, maximum) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${fieldName} must be a finite number.`);
    return;
  }

  if (value < minimum || value > maximum) {
    errors.push(`${fieldName} must be between ${minimum} and ${maximum}.`);
  }
}

function validateSkills(value, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('skills must be a non-empty array of strings.');
    return;
  }

  if (value.length > 20) {
    errors.push('skills must contain at most 20 items.');
  }

  value.forEach((skill, index) => {
    if (typeof skill !== 'string' || skill.trim().length === 0) {
      errors.push(`skills[${index}] must be a non-empty string.`);
    } else if (skill.trim().length > 80) {
      errors.push(`skills[${index}] must be at most 80 characters.`);
    }
  });
}

function validateCoreFields(value, errors) {
  validateNonEmptyString(value.workerId, 'workerId', errors, 100);
  validateNonEmptyString(value.workerName, 'workerName', errors, 120);

  if (!Number.isSafeInteger(value.jobsCompleted) || value.jobsCompleted < 0) {
    errors.push('jobsCompleted must be a non-negative safe integer.');
  }

  validateFiniteNumber(value.rating, 'rating', errors, 0, 5);
  validateFiniteNumber(value.reliability, 'reliability', errors, 0, 100);
  validateSkills(value.skills, errors);
  validateNonEmptyString(value.issuingPlatform, 'issuingPlatform', errors, 120);
}

function parseCreatePassportInput(body) {
  const errors = [];

  if (!isPlainObject(body)) {
    return {
      ok: false,
      errors: ['Request body must be a JSON object.']
    };
  }

  validateCoreFields(body, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      workerId: body.workerId.trim(),
      workerName: body.workerName.trim(),
      jobsCompleted: body.jobsCompleted,
      rating: body.rating,
      reliability: body.reliability,
      skills: body.skills.map((skill) => skill.trim()),
      issuingPlatform: body.issuingPlatform.trim()
    }
  };
}

function validateSignedPassport(passport) {
  const errors = [];

  if (!isPlainObject(passport)) {
    return {
      ok: false,
      errors: ['Request body must be a signed passport JSON object.']
    };
  }

  const actualFields = Object.keys(passport).sort();
  const expectedFields = [...PASSPORT_FIELDS].sort();

  if (
    actualFields.length !== expectedFields.length ||
    actualFields.some((field, index) => field !== expectedFields[index])
  ) {
    errors.push(`Passport must contain exactly these fields: ${PASSPORT_FIELDS.join(', ')}.`);
  }

  validateCoreFields(passport, errors);

  if (typeof passport.timestamp !== 'string') {
    errors.push('timestamp must be an ISO 8601 string.');
  } else {
    const parsedTimestamp = new Date(passport.timestamp);
    if (
      Number.isNaN(parsedTimestamp.getTime()) ||
      parsedTimestamp.toISOString() !== passport.timestamp
    ) {
      errors.push('timestamp must be a valid canonical ISO 8601 timestamp.');
    }
  }

  if (typeof passport.signature !== 'string' || passport.signature.length === 0) {
    errors.push('signature must be a non-empty base64 string.');
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

module.exports = {
  PASSPORT_FIELDS,
  SIGNED_FIELDS,
  parseCreatePassportInput,
  validateSignedPassport
};
