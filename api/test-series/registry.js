import { getRegistry, REGISTRY_URL, safeErrorCode, sendJson, sendMethodNotAllowed } from "../_shared.js";

export default async function handler(request, response) {
  if (request.method !== "GET") return sendMethodNotAllowed(response);
  try {
    const { institutions, raw } = await getRegistry();
    return sendJson(response, 200, {
      registry_url: REGISTRY_URL,
      institutions,
      warnings: [],
      raw,
    }, "public, max-age=60, stale-while-revalidate=240");
  } catch (error) {
    console.error("Institution registry request failed:", error);
    return sendJson(response, 502, { error: "The institution directory is temporarily unavailable.", code: safeErrorCode(error) });
  }
}