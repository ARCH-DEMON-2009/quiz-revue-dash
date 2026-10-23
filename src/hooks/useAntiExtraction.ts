import { useEffect } from "react";
import { useAdminBadgeConfig } from "@/hooks/useAdminBadgeConfig";

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
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("selectstart", prevent);
      document.removeEventListener("dragstart", prevent);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("anti-extract");
    };
  }, [active]);

  return active;
}
