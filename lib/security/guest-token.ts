import crypto from "crypto";

export function createGuestToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashGuestToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function compareGuestToken(raw: string, expectedHash: string) {
  const actual = hashGuestToken(raw);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(actual),
      Buffer.from(expectedHash)
    );
  } catch {
    return false;
  }
}
