'use strict';

const express = require('express');
const { createPassportController } = require('./passportController');
const { createPassportSigner } = require('./passportCrypto');
const { createPassportService } = require('./passportService');
const { createPassportStore } = require('./storage');

function createApp(options = {}) {
  const signer =
    options.signer ||
    createPassportSigner({
      keysDirectory: options.keysDirectory
    });

  const store =
    options.store ||
    createPassportStore({
      filePath: options.dataFile
    });

  const service =
    options.service ||
    createPassportService({
      signer,
      store,
      clock: options.clock
    });

  const controller = createPassportController(service);
  const app = express();

  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  });

  app.use(express.json({ limit: '100kb' }));

  app.post('/api/passport', controller.createPassport);
  app.post('/api/passport/verify', controller.verifyPassport);

  app.use((req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'API route not found.'
    });
  });

  // Express identifies malformed JSON using this error type.
  app.use((error, req, res, next) => {
    if (error && error.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: 'INVALID_JSON',
        message: 'Request body must contain valid JSON.'
      });
    }

    console.error(error);
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'The server could not complete the request.'
    });
  });

  return app;
}

module.exports = {
  createApp
};
