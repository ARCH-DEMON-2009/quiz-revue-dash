import { useEffect } from "react";
import { useAdminBadgeConfig } from "@/hooks/useAdminBadgeConfig";
import { supabase } from "@/integrations/supabase/client";

const NOTICE = "Content © Test Sagar (tncnursing.site). Copying or sharing questions is prohibited.";

/**
 * Blocks copy, cut, select, drag, right-click, print and common
 * save/devtools shortcuts while mounted. Honors the admin anti_extraction toggle.
 */
export function useAntiExtraction(enabled = true) {
  const { config } = useAdminBadgeConfig() as any;
  const active = enabled && config?.anti_extraction !== false;

  useEffect(() => {
    if (!active) return;
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const prevent = (e: Event) => {
      if (isField(e.target)) return;
      e.preventDefault();
    };
    const onCopy = (e: ClipboardEvent) => {
      if (isField(e.target)) return;
      e.preventDefault();
      e.clipboardData?.setData("text/plain", NOTICE);
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "F12" || e.key === "PrintScreen") e.preventDefault();
      if (mod && ["p", "s", "u"].includes(k)) e.preventDefault();
      if (mod && !isField(e.target) && ["c", "x", "a"].includes(k)) e.preventDefault();
      if (mod && e.shiftKey && ["i", "j", "c"].includes(k)) e.preventDefault();
      if (e.key === "PrintScreen") navigator.clipboard?.writeText(NOTICE).catch(() => {});
    };
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("selectstart", prevent);
    document.addEventListener("dragstart", prevent);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("anti-extract");

    // Forensic watermark: faint tiled student identity so screenshots/photos are traceable.
    const mark = document.createElement("div");
    mark.setAttribute("aria-hidden", "true");
    mark.style.cssText = "position:fixed;inset:0;z-index:60;pointer-events:none;background-repeat:repeat;";
    const paint = (label: string) => {
      const safe = label.replace(/[<>&'"]/g, "");
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='220'><text x='10' y='120' transform='rotate(-24 210 110)' font-family='sans-serif' font-size='15' fill='rgb(120,120,140)' fill-opacity='0.14'>${safe}</text></svg>`;
      mark.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    };
    paint("Test Sagar • tncnursing.site");
    document.body.appendChild(mark);
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      paint(`Test Sagar • ${u.email || u.phone || "student"} • ${u.id.slice(0, 6)} • ${new Date().toLocaleDateString("en-IN")}`);
    });
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("selectstart", prevent);
      document.removeEventListener("dragstart", prevent);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("anti-extract");
      mark.remove();
    };
  }, [active]);

  return active;
}
