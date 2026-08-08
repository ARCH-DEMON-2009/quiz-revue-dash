import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const UPSTREAM_BASE = "https://spidyrwa.vercel.app/api/proxy";
// These should be set via secrets: rwa-study-auth, rwa-study-aes-key, rwa-study-aes-iv
const AUTH_TOKEN = Deno.env.get("RWA_STUDY_AUTH_TOKEN");
const AES_KEY = Deno.env.get("RWA_STUDY_AES_KEY"); // Hex or base64
const AES_IV = Deno.env.get("RWA_STUDY_AES_IV");   // Hex or base64

async function decryptVaultData(encryptedData: string): Promise<any> {
  if (!AES_KEY || !AES_IV) {
    console.warn("AES_KEY or AES_IV not set, returning raw encrypted data");
    return { vaultData: encryptedData, decrypted: false };
  }
  
  try {
    // Implement AES decryption here once the algorithm and key are confirmed.
    // For now, we'll return a helpful error if keys are missing.
    return { error: "Decryption implementation pending key confirmation", vaultData: encryptedData };
  } catch (err) {
    console.error("Decryption failed", err);
    throw new Error("Failed to decrypt upstream data");
  }
}

async function fetchUpstream(endpoint: string) {
  const url = `${UPSTREAM_BASE}?endpoint=${encodeURIComponent(endpoint)}`;
  console.log(`Fetching upstream: ${url}`);
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  
  if (AUTH_TOKEN) {
    headers["Authorization"] = AUTH_TOKEN;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Upstream error: ${res.status} ${errorText}`);
    throw new Error(`Upstream service returned ${res.status}`);
  }
  
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    let result: any;

    switch (action) {
      case "batches": {
        const data = await fetchUpstream("mycoursev2");
        if (data.vaultData) {
          result = await decryptVaultData(data.vaultData);
        } else {
          result = data;
        }
        break;
      }
      
      case "subjects": {
        const courseId = url.searchParams.get("courseId");
        if (!courseId) throw new Error("courseId required");
        result = await fetchUpstream(`get/allsubjectfrmlivecourseclass?courseid=${courseId}&start=-1`);
        break;
      }
      
      case "topics": {
        const courseId = url.searchParams.get("courseId");
        const subjectId = url.searchParams.get("subjectId");
        if (!courseId || !subjectId) throw new Error("courseId and subjectId required");
        result = await fetchUpstream(`get/alltopicfrmlivecourseclass?courseid=${courseId}&subjectid=${subjectId}`);
        break;
      }
      
      case "content": {
        const topicId = url.searchParams.get("topicId");
        const courseId = url.searchParams.get("courseId");
        const subjectId = url.searchParams.get("subjectId");
        if (!topicId || !courseId || !subjectId) throw new Error("topicId, courseId, and subjectId required");
        result = await fetchUpstream(`get/livecourseclassbycoursesubtopconceptapiv3?topicid=${topicId}&start=-1&conceptid=1&courseid=${courseId}&subjectid=${subjectId}`);
        break;
      }
      
      case "video": {
        const courseId = url.searchParams.get("courseId");
        const videoId = url.searchParams.get("videoId");
        if (!courseId || !videoId) throw new Error("courseId and videoId required");
        result = await fetchUpstream(`get/fetchVideoDetailsById?course_id=${courseId}&video_id=${videoId}&ytflag=0&folder_wise_course=0`);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({
      ok: true,
      data: result,
      fetchedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Study API error:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err.message
      }
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
