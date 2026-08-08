import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";


const UPSTREAM_BASE = "https://spidyrwa.vercel.app/api/proxy";
// These should be set via secrets: rwa-study-auth, rwa-study-aes-key, rwa-study-aes-iv
const AUTH_TOKEN = Deno.env.get("RWA_STUDY_AUTH_TOKEN");
const AES_KEY_STR = Deno.env.get("RWA_STUDY_AES_KEY") || "80RPMPTEC80RPMPTEC80RPMPTEC80RPM"; // 32 chars
const AES_IV_STR = Deno.env.get("RWA_STUDY_AES_IV") || "80RPMPTEC80RPMPT"; // 16 chars

async function decryptVaultData(encryptedData: string): Promise<any> {
  try {
    const key = new TextEncoder().encode(AES_KEY_STR);
    const iv = new TextEncoder().encode(AES_IV_STR);
    
    // Decode base64
    const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      cryptoKey,
      encryptedBuffer
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedText);
  } catch (err) {
    console.error("Decryption failed:", err);
    // Return original data if decryption fails so frontend can show helpful error
    return { error: "Decryption failed. Check RWA_STUDY_AES_KEY and IV.", raw: encryptedData };
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

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
