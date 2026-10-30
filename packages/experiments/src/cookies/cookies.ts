import type { CookieStore } from "../core/types.js";

export const STABLE_ID_COOKIE_NAME = "statsiguuid";
export const SHARED_COOKIE_DOMAIN = ".simpleonlinepharmacy.co.uk";

const STABLE_ID_MAX_AGE_SECONDS = 31_536_000;
const SHARED_COOKIE_HOST_SUFFIX = "simpleonlinepharmacy.co.uk";
const STABLE_ID_PATTERN = /^[\dA-Za-z-]{16,128}$/;

export function isSharedCookieHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  return host === SHARED_COOKIE_HOST_SUFFIX || host.endsWith(`.${SHARED_COOKIE_HOST_SUFFIX}`);
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function readCookieValue(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    if (trimmed.slice(0, separator) !== name) continue;
    return decodeCookieValue(trimmed.slice(separator + 1));
  }
  return null;
}

export function readSnowplowDomainUserId(cookieHeader: string): string | undefined {
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const name = trimmed.slice(0, separator);
    if (name !== "_sp_id" && !name.startsWith("_sp_id.")) continue;
    const domainUserId = decodeCookieValue(trimmed.slice(separator + 1)).split(".")[0];
    if (domainUserId) return domainUserId;
  }
  return undefined;
}

export function readStableId(cookieHeader: string): string | null {
  const value = readCookieValue(cookieHeader, STABLE_ID_COOKIE_NAME);
  if (!value || !STABLE_ID_PATTERN.test(value)) return null;
  return value;
}

export function createStableId(): string | null {
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") return null;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let hex = "";
  for (let index = 0; index < bytes.length; index += 1) {
    hex += (bytes[index] ?? 0).toString(16).padStart(2, "0");
  }
  return hex;
}

export function readOrCreateStableId(
  store: CookieStore,
  hostname: string,
  secure: boolean
): string | null {
  const existing = readStableId(store.read());
  if (existing) {
    return persistStableId(store, existing, hostname, secure) ? existing : null;
  }

  const created = createStableId();
  if (!created) return null;
  return persistStableId(store, created, hostname, secure) ? created : null;
}

function persistStableId(
  store: CookieStore,
  stableId: string,
  hostname: string,
  secure: boolean
): boolean {
  const sharedHost = isSharedCookieHost(hostname);
  const attributes = [
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${STABLE_ID_MAX_AGE_SECONDS}`,
  ];
  if (sharedHost) attributes.push(`Domain=${SHARED_COOKIE_DOMAIN}`);
  if (secure) attributes.push("Secure");

  if (sharedHost) {
    store.write(`${STABLE_ID_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`);
  }
  store.write([`${STABLE_ID_COOKIE_NAME}=${stableId}`, ...attributes].join("; "));
  return readStableId(store.read()) === stableId;
}
