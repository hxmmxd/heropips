/** Keyset cursor over (created_at, id), opaque to clients. */
export type Cursor = { createdAt: Date; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt.toISOString()}|${c.id}`, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  const text = Buffer.from(raw, "base64url").toString("utf8");
  const sep = text.indexOf("|");
  if (sep <= 0) return null;
  const createdAt = new Date(text.slice(0, sep));
  const id = text.slice(sep + 1);
  if (Number.isNaN(createdAt.getTime()) || id.length === 0) return null;
  return { createdAt, id };
}
