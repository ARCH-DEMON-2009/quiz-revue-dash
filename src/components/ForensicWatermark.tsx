import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Faint, click-through tiled watermark with the signed-in student's identity,
 * so screenshots or phone photos of questions trace back to the account.
 */
const ForensicWatermark = () => {
  const [label, setLabel] = useState("Test Sagar • tncnursing.site");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const id = u.email || u.phone || u.id.slice(0, 8);
      const d = new Date().toLocaleDateString("en-IN");
      setLabel(`Test Sagar • ${id} • ${u.id.slice(0, 6)} • ${d}`);
    });
  }, []);

  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='220'><text x='10' y='120' transform='rotate(-24 210 110)' font-family='sans-serif' font-size='15' fill='rgb(120,120,140)' fill-opacity='0.13'>${label.replace(/[<>&'"]/g, "")}</text></svg>`,
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] select-none"
      style={{ backgroundImage: `url("data:image/svg+xml,${svg}")`, backgroundRepeat: "repeat" }}
    />
  );
};

export default ForensicWatermark;
