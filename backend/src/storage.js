'use strict';

const fs = require('node:fs');
const path = require('node:path');

function ensurePassportFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]\n', 'utf8');
  }
}

function readPassports(filePath) {
  ensurePassportFile(filePath);

  const rawContents = fs.readFileSync(filePath, 'utf8');
  const passports = JSON.parse(rawContents);

  if (!Array.isArray(passports)) {
    throw new Error(`Passport storage file must contain a JSON array: ${filePath}`);
  }

  return passports;
}

function createPassportStore(options = {}) {
  const filePath =
    options.filePath ||
    process.env.PASSPORT_DATA_FILE ||
    path.join(__dirname, '..', 'data', 'passports.json');

  ensurePassportFile(filePath);

  function save(passport) {
    const passports = readPassports(filePath);
    passports.push(passport);

    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(passports, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryPath, filePath);
  }

  return {
    filePath,
    readAll: () => readPassports(filePath),
    save
  };
}

module.exports = {
  createPassportStore
};
