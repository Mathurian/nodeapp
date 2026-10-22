const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const manifestPath = path.join(rootDir, 'config', 'offline-write-ownership.manifest.json');
const signaturePath = path.join(rootDir, 'config', 'offline-write-ownership.manifest.sig');

const readString = (key) => {
  const value = process.env[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveProvider = () => {
  const provider = (readString('CRYPTO_PROVIDER') || readString('SECRETS_PROVIDER') || 'env').toLowerCase();
  if (['env', 'local', 'aws', 'vault'].includes(provider)) {
    return provider;
  }

  return 'env';
};

const readPrivateKeyPem = (provider) => {
  if (provider === 'env') {
    const privateKeyPem = readString('MANIFEST_SIGNING_PRIVATE_KEY');
    const keyId = readString('MANIFEST_SIGNING_KEY_ID') || 'local-manifest-key';
    if (!privateKeyPem) {
      throw new Error('MANIFEST_SIGNING_PRIVATE_KEY is required for env manifest signing');
    }

    return { keyId, privateKeyPem };
  }

  if (provider === 'local') {
    const privateKeyPath =
      readString('MANIFEST_SIGNING_PRIVATE_KEY_PATH') ||
      path.join(rootDir, 'config', 'keys', 'manifest-signing-private.pem');
    const keyId = readString('MANIFEST_SIGNING_KEY_ID') || 'local-manifest-key';
    if (!fs.existsSync(privateKeyPath)) {
      throw new Error(`Manifest signing private key not found: ${privateKeyPath}`);
    }

    return {
      keyId,
      privateKeyPem: fs.readFileSync(privateKeyPath, 'utf8'),
    };
  }

  throw new Error(
    `CRYPTO_PROVIDER=${provider} is not supported by this local signing script. Use the trusted CI/KMS signer for production-grade providers.`,
  );
};

const detectAlgorithm = (privateKeyObject) => {
  switch (privateKeyObject.asymmetricKeyType) {
    case 'ed25519':
      return { nodeAlgorithm: null, manifestAlgorithm: 'ed25519' };
    case 'rsa':
    case 'rsa-pss':
      return { nodeAlgorithm: 'sha256', manifestAlgorithm: 'rsa-sha256' };
    default:
      throw new Error(
        `Unsupported manifest signing key type: ${privateKeyObject.asymmetricKeyType || 'unknown'}`,
      );
  }
};

const main = () => {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found: ${manifestPath}`);
  }

  const provider = resolveProvider();
  const { keyId, privateKeyPem } = readPrivateKeyPem(provider);
  const payload = fs.readFileSync(manifestPath);
  const privateKeyObject = crypto.createPrivateKey(privateKeyPem);
  const { nodeAlgorithm, manifestAlgorithm } = detectAlgorithm(privateKeyObject);

  const signature = crypto.sign(nodeAlgorithm, payload, privateKeyObject);
  const envelope = {
    version: 1,
    provider,
    algorithm: manifestAlgorithm,
    keyId,
    manifestHash: crypto.createHash('sha256').update(payload).digest('hex'),
    signature: signature.toString('base64'),
    signedAt: new Date().toISOString(),
  };

  fs.writeFileSync(signaturePath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `Signed offline write ownership manifest with ${provider} provider -> ${signaturePath}\n`,
  );
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
