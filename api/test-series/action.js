import {
  ALLOWED_UPSTREAM_HOSTS,
  APPX_URL,
  fetchTrustedJson,
  getRegistry,
  isRegisteredInstitution,
  RESPONSE_LIMITS,
  sendJson,
  sendMethodNotAllowed,
} from "../_shared.js";

const MAX_ID_LENGTH = 128;

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;
}

export default async function handler(request, response) {
  if (request.method !== "GET") return sendMethodNotAllowed(response);
  const requestUrl = new URL(request.url, "https://test.tncnursing.site");
  const apiUrl = requestUrl.searchParams.get("api_url");
  const action = requestUrl.searchParams.get("action");
  const testId = requestUrl.searchParams.get("test_id");
  const subjectId = requestUrl.searchParams.get("subject_id");

  if (!apiUrl || !["series", "subjects", "titles"].includes(action)) {
    return sendJson(response, 400, { error: "A registered institution and valid action are required." });
  }
  if ((action === "subjects" || action === "titles") && !validId(testId)) {
    return sendJson(response, 400, { error: "A valid test_id is required." });
  }
  if (action === "titles" && !validId(subjectId)) {
    return sendJson(response, 400, { error: "A valid subject_id is required." });
  }

  try {
    const { institutions } = await getRegistry();
    if (!isRegisteredInstitution(apiUrl, institutions)) {
      return sendJson(response, 403, { error: "The institution URL is not in the current registry." });
    }

    const upstreamUrl = new URL(APPX_URL);
    upstreamUrl.searchParams.set("bash_url", apiUrl);
    upstreamUrl.searchParams.set("action", action);
    if (testId !== null) upstreamUrl.searchParams.set("test_id", testId);
    if (subjectId !== null) upstreamUrl.searchParams.set("subject_id", subjectId);

    const { payload } = await fetchTrustedJson(upstreamUrl.toString(), ALLOWED_UPSTREAM_HOSTS.appx, RESPONSE_LIMITS.action, { allowHtmlJson: true });
    return sendJson(response, 200, { action, api_url: apiUrl, data: payload });
  } catch (error) {
    console.error("Institution action request failed:", error);
    return sendJson(response, 502, { error: "The institution test provider is temporarily unavailable." });
  }
}