'use strict';

function createPassportController(service) {
  function createPassport(req, res, next) {
    try {
      const result = service.createPassport(req.body);

      if (!result.ok) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          details: result.errors
        });
      }

      return res.status(201).json(result.passport);
    } catch (error) {
      return next(error);
    }
  }

  function verifyPassport(req, res, next) {
    try {
      const result = service.verifyPassport(req.body);

      if (!result.ok) {
        return res.status(400).json({
          error: 'INVALID_PASSPORT',
          details: result.errors
        });
      }

      return res.status(200).json({
        valid: result.valid,
        message: result.valid
          ? 'Passport signature is valid. The signed data has not been modified.'
          : 'Passport signature is invalid. The passport data or signature may have been modified.'
      });
    } catch (error) {
      return next(error);
    }
  }

  return {
    createPassport,
    verifyPassport
  };
}

module.exports = {
  createPassportController
};
