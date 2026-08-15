'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { SIGNED_FIELDS } = require('./validation');

const SIGNATURE_ALGORITHM = 'Ed25519';
const PRIVATE_KEY_FILE = 'issuer-private.pem';
const PUBLIC_KEY_FILE = 'issuer-public.pem';

function canonicalizePassport(passport) {
  const signablePassport = {};

  for (const field of SIGNED_FIELDS) {
    signablePassport[field] = passport[field];
  }

  return JSON.stringify(signablePassport);
}

function writeKeyFile(filePath, contents, mode) {
  fs.writeFileSync(filePath, contents, {
    encoding: 'utf8',
    flag: 'wx',
    mode
  });
}

function loadOrCreateKeyPair(keysDirectory) {
  fs.mkdirSync(keysDirectory, { recursive: true });

  const privateKeyPath = path.join(keysDirectory, PRIVATE_KEY_FILE);
  const publicKeyPath = path.join(keysDirectory, PUBLIC_KEY_FILE);
  const hasPrivateKey = fs.existsSync(privateKeyPath);
  const hasPublicKey = fs.existsSync(publicKeyPath);

  if (hasPrivateKey !== hasPublicKey) {
    throw new Error(
      `Issuer key pair is incomplete. Both ${PRIVATE_KEY_FILE} and ${PUBLIC_KEY_FILE} must exist, or neither must exist.`
    );
  }

  if (!hasPrivateKey) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      },
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      }
    });

    writeKeyFile(privateKeyPath, privateKey, 0o600);
    writeKeyFile(publicKeyPath, publicKey, 0o644);
  }

  return {
    privateKey: crypto.createPrivateKey(fs.readFileSync(privateKeyPath, 'utf8')),
    publicKey: crypto.createPublicKey(fs.readFileSync(publicKeyPath, 'utf8')),
    privateKeyPath,
    publicKeyPath
  };
}

function decodeBase64Signature(signature) {
  if (
    typeof signature !== 'string' ||
    signature.length === 0 ||
    signature.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)
  ) {
    return null;
  }

  const decoded = Buffer.from(signature, 'base64');

  // Ed25519 signatures are always 64 bytes.
  return decoded.length === 64 ? decoded : null;
}

function createPassportSigner(options = {}) {
  const keysDirectory =
    options.keysDirectory ||
    process.env.PASSPORT_KEYS_DIR ||
    path.join(__dirname, '..', 'keys');

  const keyPair = loadOrCreateKeyPair(keysDirectory);

  function sign(passport) {
    const serializedPassport = canonicalizePassport(passport);
    const signature = crypto.sign(
      null,
      Buffer.from(serializedPassport, 'utf8'),
      keyPair.privateKey
    );

    return signature.toString('base64');
  }

  function verify(passport) {
    const signature = decodeBase64Signature(passport.signature);

    if (!signature) {
      return false;
    }

    try {
      const serializedPassport = canonicalizePassport(passport);
      return crypto.verify(
        null,
        Buffer.from(serializedPassport, 'utf8'),
        keyPair.publicKey,
        signature
      );
    } catch {
      return false;
    }
  }

  return {
    algorithm: SIGNATURE_ALGORITHM,
    privateKeyPath: keyPair.privateKeyPath,
    publicKeyPath: keyPair.publicKeyPath,
    sign,
    verify
  };
}

module.exports = {
  SIGNATURE_ALGORITHM,
  canonicalizePassport,
  createPassportSigner
};
