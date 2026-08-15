'use strict';

const { createApp } = require('./app');

const port = Number.parseInt(process.env.PORT || '5000', 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const app = createApp();

app.listen(port, () => {
  console.log(`Gig Worker Reputation Passport API listening on http://localhost:${port}`);
});
