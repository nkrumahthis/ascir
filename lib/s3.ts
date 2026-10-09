import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT!; // https://hel1.your-objectstorage.com
export const bucket = process.env.S3_BUCKET!;

export const s3 = new S3Client({
  endpoint,
  region: new URL(endpoint).hostname.split(".")[0], // hel1
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  // Hetzner doesn't support the SDK's default checksum headers.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const publicUrl = (key: string) => `https://${bucket}.${new URL(endpoint).host}/${key}`;

export const uploadObject = (key: string, body: Buffer | Uint8Array | string, contentType?: string) =>
  s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));

export const deleteObject = (key: string) =>
  s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

export const getUploadUrl = (key: string, contentType: string, expiresIn = 300) =>
  getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn });

export const getDownloadUrl = (key: string, expiresIn = 3600) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
