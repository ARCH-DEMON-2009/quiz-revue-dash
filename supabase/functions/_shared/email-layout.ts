// Shared Test Sagar email layout: midnight indigo/emerald glass look matching the website.
export const SITE = "https://test.tncnursing.site";
export const WHATSAPP = "https://wa.me/84522122461";

export const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

type Tone = "brand" | "success" | "warning" | "danger";
const TONES: Record<Tone, { grad: string; chip: string; chipText: string }> = {
  brand: { grad: "linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#10b981 100%)", chip: "rgba(99,102,241,.18)", chipText: "#a5b4fc" },
  success: { grad: "linear-gradient(135deg,#059669 0%,#10b981 45%,#6366f1 100%)", chip: "rgba(16,185,129,.18)", chipText: "#6ee7b7" },
  warning: { grad: "linear-gradient(135deg,#d97706 0%,#f59e0b 50%,#6366f1 100%)", chip: "rgba(245,158,11,.18)", chipText: "#fcd34d" },
  danger: { grad: "linear-gradient(135deg,#b91c1c 0%,#ef4444 50%,#6366f1 100%)", chip: "rgba(239,68,68,.18)", chipText: "#fca5a5" },
};

export const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 8px"><tr><td style="border-radius:12px;background:linear-gradient(135deg,#6366f1,#10b981)"><a href="${href}" style="display:inline-block;padding:14px 34px;font-weight:700;font-size:15px;color:#ffffff;text-decoration:none;border-radius:12px">${label}</a></td></tr></table>`;

export const detailsTable = (rows: [string, string, string?][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1229;border:1px solid rgba(148,163,184,.18);border-radius:14px;margin:22px 0">${rows
    .map(([k, v, color], i) =>
      `<tr><td style="padding:13px 18px;color:#94a3b8;font-size:14px;${i ? "border-top:1px solid rgba(148,163,184,.12);" : ""}">${k}</td><td style="padding:13px 18px;text-align:right;font-weight:700;font-size:14px;color:${color || "#f1f5f9"};word-break:break-all;${i ? "border-top:1px solid rgba(148,163,184,.12);" : ""}">${v}</td></tr>`)
    .join("")}</table>`;

export const list = (items: string[], mark = "✓", color = "#34d399") =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0">${items
    .map((t) => `<tr><td style="padding:5px 10px 5px 0;color:${color};font-weight:700;vertical-align:top">${mark}</td><td style="padding:5px 0;color:#cbd5e1;font-size:14px">${t}</td></tr>`)
    .join("")}</table>`;

export const callout = (html: string, tone: Tone = "warning") =>
  `<div style="background:${TONES[tone].chip};border:1px solid ${TONES[tone].chipText}55;border-radius:12px;padding:14px 16px;margin:18px 0;color:${TONES[tone].chipText};font-size:14px;font-weight:600">${html}</div>`;

export function renderEmail(opts: { tone?: Tone; badge: string; title: string; subtitle?: string; preheader?: string; body: string }) {
  const t = TONES[opts.tone || "brand"];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#050816;font-family:Poppins,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader || opts.subtitle || "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050816;background-image:radial-gradient(circle at 15% 0%,rgba(99,102,241,.35),transparent 45%),radial-gradient(circle at 90% 10%,rgba(16,185,129,.25),transparent 40%)"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td align="center" style="padding-bottom:20px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#10b981);text-align:center;color:#fff;font-weight:800;font-size:18px">TS</td>
    <td style="padding-left:10px;color:#f8fafc;font-size:20px;font-weight:800;letter-spacing:.3px">Test <span style="color:#34d399">Sagar</span></td>
  </tr></table>
</td></tr>
<tr><td style="background:rgba(15,23,42,.92);border:1px solid rgba(148,163,184,.18);border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(2,6,23,.6)">
  <div style="height:5px;background:${t.grad}"></div>
  <div style="padding:34px 30px 8px;text-align:center">
    <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${t.chip};color:${t.chipText};font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase">${opts.badge}</span>
    <h1 style="margin:16px 0 8px;color:#f8fafc;font-size:26px;line-height:1.3;font-weight:800">${opts.title}</h1>
    ${opts.subtitle ? `<p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.6">${opts.subtitle}</p>` : ""}
  </div>
  <div style="padding:10px 30px 32px;color:#cbd5e1;font-size:15px;line-height:1.75">${opts.body}</div>
</td></tr>
<tr><td style="padding:24px 10px;text-align:center;color:#64748b;font-size:12px;line-height:1.7">
  Need help? <a href="${WHATSAPP}" style="color:#34d399;text-decoration:none;font-weight:600">WhatsApp support</a> · <a href="${SITE}" style="color:#a5b4fc;text-decoration:none">test.tncnursing.site</a><br>
  © ${new Date().getFullYear()} Test Sagar. Practice smarter, rank higher.
</td></tr>
</table></td></tr></table></body></html>`;
}
