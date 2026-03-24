/**
 * Storage client — wraps AWS S3 (or Cloudflare R2, which is S3-compatible).
 *
 * Required env vars:
 *   STORAGE_ENDPOINT   — S3 endpoint URL (omit for AWS, set for R2/MinIO)
 *   STORAGE_REGION     — e.g. "us-east-1" or "auto" for R2
 *   STORAGE_BUCKET     — bucket name
 *   STORAGE_KEY_ID     — access key ID
 *   STORAGE_SECRET_KEY — secret access key
 *
 * Both AWS S3 and Cloudflare R2 are supported via the same S3-compatible API.
 */

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let _client;

function getClient() {
  if (!_client) {
    const config = {
      region: process.env.STORAGE_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.STORAGE_KEY_ID,
        secretAccessKey: process.env.STORAGE_SECRET_KEY,
      },
    };

    // R2/MinIO require a custom endpoint
    if (process.env.STORAGE_ENDPOINT) {
      config.endpoint = process.env.STORAGE_ENDPOINT;
      config.forcePathStyle = true; // required for R2 and most S3-compatible services
    }

    _client = new S3Client(config);
  }
  return _client;
}

const BUCKET = () => process.env.STORAGE_BUCKET;

/**
 * Check whether storage is configured. Returns false if env vars are missing.
 */
function isConfigured() {
  return !!(
    process.env.STORAGE_BUCKET &&
    process.env.STORAGE_KEY_ID &&
    process.env.STORAGE_SECRET_KEY
  );
}

/**
 * Upload a buffer to S3/R2 and return the object key.
 *
 * @param {Buffer}  buffer      - File content
 * @param {string}  key         - S3 object key (e.g. "pdfs/user-1/lesson-42.pdf")
 * @param {string}  contentType - MIME type
 * @returns {Promise<string>} The object key
 */
async function upload(buffer, key, contentType = 'application/octet-stream') {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

/**
 * Generate a presigned GET URL valid for the specified number of seconds.
 *
 * @param {string} key         - S3 object key
 * @param {number} expiresIn   - Seconds until expiry (default 3600 = 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: BUCKET(), Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete an object from storage.
 *
 * @param {string} key - S3 object key
 */
async function remove(key) {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}

module.exports = { isConfigured, upload, getPresignedUrl, remove };
