export const REGISTRY_URL = "https://studyuk.online/appxapis.json";
export const APPX_URL = "https://studyuk.online/appx.php";

const APPX_HOSTS = new Set(["studyuk.online"]);
const QUESTION_HOSTS = new Set(["appxcontent.kaxa.in"]);
const REGISTRY_MAX_BYTES = 5 * 1024 * 1024;
const ACTION_MAX_BYTES = 5 * 1024 * 1024;
const QUESTIONS_MAX_BYTES = 20 * 1024 * 1024;
const RESPONSE_MAX_BYTES = 4 * 1024 * 1024;
const REGISTRY_CACHE_MS = 5 * 60 * 1000;

let registryCache;
let registryCacheUntil = 0;
let registryPending;

export function sendJson(response, status, payload, cacheControl = "no-store") {
  const serialized = JSON.stringify(payload);
  if (new TextEncoder().encode(serialized).byteLength > RESPONSE_MAX_BYTES) {
    status = 413;
    payload = { error: "The response exceeds the maximum supported size." };
  }
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", cacheControl);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(status === 413 ? JSON.stringify(payload) : serialized);
}

export function sendMethodNotAllowed(response) {
  response.setHeader("Allow", "GET");
  sendJson(response, 405, { error: "Method not allowed." });
}

export function safeErrorCode(error) {
  if (error?.name === "AbortError") return "upstream_timeout";
  const message = error instanceof Error ? error.message : "";
  const status = message.match(/HTTP (\d{3})/);
  if (status) return `upstream_http_${status[1]}`;
  if (/did not return JSON|invalid JSON|was not a list/.test(message)) return "upstream_invalid_response";
  if (/size limit/.test(message)) return "upstream_response_too_large";
  if (error instanceof TypeError || error?.cause?.code) return "upstream_network_error";
  return "proxy_error";
}

function secureUrl(value, allowedHosts) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (!allowedHosts.has(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

async function readLimitedText(response, maxBytes) {
  if (!response.body) throw new Error("The upstream response was empty.");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    size += bytes.byteLength;
    if (size > maxBytes) {
      throw new Error("The upstream response exceeded the size limit.");
    }
    chunks.push(bytes);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(result);
}

export async function fetchTrustedJson(value, allowedHosts, maxBytes, { allowHtmlJson = false } = {}) {
  let currentUrl = secureUrl(value, allowedHosts);
  if (!currentUrl) throw new Error("The upstream URL is not trusted.");

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(currentUrl, {
        headers: { Accept: "application/json" },
        redirect: "manual",
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location || redirects === 3) throw new Error("The upstream redirect limit was exceeded.");
        const nextUrl = secureUrl(new URL(location, currentUrl).toString(), allowedHosts);
        if (!nextUrl) throw new Error("The upstream redirected to an untrusted URL.");
        currentUrl = nextUrl;
        continue;
      }

      if (!response.ok) throw new Error(`Upstream request failed with HTTP ${response.status}.`);
      const contentType = response.headers.get("content-type") ?? "";
      const isJsonType = /(application\/json|\+json)(;|$)/i.test(contentType);
      const isTrustedLegacyJson = allowHtmlJson && APPX_HOSTS.has(currentUrl.hostname) && /^text\/html(?:;|$)/i.test(contentType);
      if (!isJsonType && !isTrustedLegacyJson) {
        throw new Error("The upstream did not return JSON.");
      }
      const text = await readLimitedText(response, maxBytes);
      try {
        return { payload: JSON.parse(text), sourceUrl: currentUrl.toString() };
      } catch {
        throw new Error("The upstream returned invalid JSON.");
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("The upstream redirect limit was exceeded.");
}

function isInstitution(item) {
  if (!item || typeof item.name !== "string" || !item.name.trim()) return false;
  if (typeof item.api !== "string") return false;
  try {
    const url = new URL(item.api);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && (!url.port || url.port === "443")
      && hostname.includes(".")
      && !hostname.startsWith("[")
      && !hostname.endsWith(".localhost")
      && !hostname.endsWith(".local")
      && hostname !== "localhost"
      && !/^\d+(\.\d+){3}$/.test(hostname);
  } catch {
    return false;
  }
}

export async function getRegistry() {
  if (registryCache && Date.now() < registryCacheUntil) return registryCache;
  if (registryPending) return registryPending;

  registryPending = (async () => {
    const { payload } = await fetchTrustedJson(REGISTRY_URL, APPX_HOSTS, REGISTRY_MAX_BYTES);
    if (!Array.isArray(payload)) throw new Error("The institution registry was not a list.");
    const unique = new Map();
    for (const item of payload) {
      if (!isInstitution(item)) continue;
      const institution = { name: item.name.trim(), api: item.api };
      unique.set(`${institution.name}\n${institution.api}`, institution);
    }
    const institutions = [...unique.values()];
    registryCache = { raw: payload, institutions };
    registryCacheUntil = Date.now() + REGISTRY_CACHE_MS;
    return registryCache;
  })();

  try {
    return await registryPending;
  } finally {
    registryPending = undefined;
  }
}

export function isRegisteredInstitution(apiUrl, institutions) {
  return typeof apiUrl === "string" && institutions.some((institution) => institution.api === apiUrl);
}

export function validQuestionUrl(value) {
  return secureUrl(value, QUESTION_HOSTS);
}

export const RESPONSE_LIMITS = {
  registry: REGISTRY_MAX_BYTES,
  action: ACTION_MAX_BYTES,
  questions: QUESTIONS_MAX_BYTES,
};

export const ALLOWED_UPSTREAM_HOSTS = {
  appx: APPX_HOSTS,
  questions: QUESTION_HOSTS,
};