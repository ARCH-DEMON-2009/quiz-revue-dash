import {
  fetchTrustedJson,
  RESPONSE_LIMITS,
  sendJson,
  sendMethodNotAllowed,
  validQuestionUrl,
} from "../_shared.js";

function extractQuestions(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.questions)) return payload.questions;
  if (Array.isArray(payload?.data)) return payload.data;
  return null;
}

export default async function handler(request, response) {
  if (request.method !== "GET") return sendMethodNotAllowed(response);
  const requestUrl = new URL(request.url, "https://test.tncnursing.site");
  const questionUrl = requestUrl.searchParams.get("url");
  if (!validQuestionUrl(questionUrl)) {
    return sendJson(response, 400, { error: "The question URL is not from a trusted HTTPS host." });
  }

  try {
    const { payload, sourceUrl } = await fetchTrustedJson(questionUrl, new Set(["appxcontent.kaxa.in"]), RESPONSE_LIMITS.questions);
    const questions = extractQuestions(payload);
    if (!questions) return sendJson(response, 502, { error: "The question provider returned an unexpected format." });
    return sendJson(response, 200, { source_url: sourceUrl, questions, raw: payload });
  } catch (error) {
    console.error("Question file request failed:", error);
    return sendJson(response, 502, { error: "The question file is temporarily unavailable." });
  }
}