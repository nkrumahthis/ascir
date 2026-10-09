// Splits a dump into batches small enough for one ingest request.

// Vercel caps request bodies at 4.5 MB; stay under 4 MB.
export const MAX_ITEMS = 50;
export const MAX_BYTES = 4 * 1024 * 1024;

const bytes = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value), "utf8");

export function toBatches<T extends { ref: string }>(
  items: readonly T[],
  limits = { items: MAX_ITEMS, bytes: MAX_BYTES },
): T[][] {
  const batches: T[][] = [];
  let batch: T[] = [];
  for (const item of items) {
    if (bytes({ items: [item] }) > limits.bytes) {
      throw new Error(`${item.ref} is too large for one request`);
    }
    const full =
      batch.length >= limits.items ||
      bytes({ items: [...batch, item] }) > limits.bytes;
    if (full) {
      batches.push(batch);
      batch = [];
    }
    batch.push(item);
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}
