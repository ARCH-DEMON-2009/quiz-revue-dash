// Shared Test Sagar email layout: warm editorial paper style (serif headings, olive accents).
export const SITE = "https://tncnursing.site";
export const LOGO = `${SITE}/logo.png`;
export const WHATSAPP = "https://wa.me/84522122461";

export const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

type Tone = "brand" | "success" | "warning" | "danger";
const KICKER: Record<Tone, string> = { brand: "#747653", success: "#5c7a4f", warning: "#9a6b2f", danger: "#9a3f33" };
const RULE: Record<Tone, string> = { brand: "#9a875f", success: "#7d9466", warning: "#b5843f", danger: "#b0574a" };

const SANS = "Arial,Helvetica,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export const button = (href: string, label: string) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 22px"><tr><td align="center" bgcolor="#626849" style="border-radius:3px"><a class="cta-link" href="${href}" style="display:inline-block;padding:15px 25px;border:1px solid #626849;border-radius:3px;background:#626849;color:#ffffff;font-family:${SANS};font-size:13px;line-height:1.2;font-weight:bold;letter-spacing:.2px;text-align:center;text-decoration:none">${label}</a></td></tr></table>`;

export const secondaryButton = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border:1px solid #c9bfa9;border-radius:3px;background:#fffefa;color:#4f5439;font-family:${SANS};font-size:12px;font-weight:bold;text-decoration:none">${label}</a>`;

export const detailsTable = (rows: [string, string, string?][]) =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 24px;border:1px solid #e6dfd2;border-radius:3px">${rows
    .map(([k, v, color], i) =>
      `<tr><td style="padding:12px 15px;color:#858074;font-family:${SANS};font-size:12px;letter-spacing:.3px;${i ? "border-top:1px solid #eee8dd;" : ""}">${k}</td><td style="padding:12px 15px;text-align:right;color:${color ? "#4f5c3a" : "#332f28"};font-family:${SANS};font-size:13px;font-weight:bold;word-break:break-all;${i ? "border-top:1px solid #eee8dd;" : ""}">${v}</td></tr>`)
    .join("")}</table>`;

export const list = (items: string[], mark = "—", _color?: string) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 10px">${items
    .map((t) => `<tr><td style="padding:5px 12px 5px 0;color:#9a875f;font-family:${SANS};font-size:13px;vertical-align:top">${mark === "✓" || mark === "✕" ? "—" : mark}</td><td style="padding:5px 0;color:#5d5a51;font-family:${SANS};font-size:14px;line-height:1.6">${t}</td></tr>`)
    .join("")}</table>`;

export const callout = (html: string, tone: Tone = "warning", label?: string) =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 22px"><tr><td style="padding:13px 15px;background:#f8f6f1;border-left:2px solid ${RULE[tone]}">${label ? `<p style="margin:0 0 6px;color:#6d6a5b;font-family:${SANS};font-size:9px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase">${label}</p>` : ""}<p style="margin:0;color:#4f4b42;font-family:${SANS};font-size:13px;line-height:1.7">${html}</p></td></tr></table>`;

export const para = (html: string) =>
  `<p style="margin:0 0 18px;color:#5d5a51;font-family:${SANS};font-size:15px;line-height:1.8">${html}</p>`;

export const subhead = (text: string) =>
  `<p style="margin:8px 0 4px;color:#332f28;font-family:${SERIF};font-size:17px">${text}</p>`;

export function renderEmail(opts: { tone?: Tone; badge: string; title: string; subtitle?: string; preheader?: string; body: string; footnote?: string }) {
  const tone = opts.tone || "brand";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${esc(opts.title)}</title>
<style>@media screen and (max-width:620px){.shell{width:100%!important;border-radius:0!important}.pad-x{padding-left:24px!important;padding-right:24px!important}.content{padding-top:34px!important;padding-bottom:32px!important}.headline{font-size:28px!important}.cta-link{display:block!important}}</style></head>
<body style="margin:0;padding:0;background:#ebe7df;color:#332f28;font-family:${SANS};-webkit-text-size-adjust:100%;">
<div style="display:none;font-size:1px;color:#ebe7df;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${esc(opts.preheader || opts.subtitle || opts.title)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ebe7df"><tr><td align="center" style="padding:42px 14px">
<table class="shell" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fffefa;border:1px solid #ded8cd;border-radius:5px;overflow:hidden">
<tr><td class="pad-x" style="padding:24px 44px 20px;background:#fffefa">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td style="vertical-align:middle"><a href="${SITE}" style="text-decoration:none"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td style="width:40px;height:40px;background:#2f2c26;border-radius:4px;text-align:center;vertical-align:middle"><img src="${LOGO}" width="36" height="36" alt="Test Sagar" style="display:block;margin:2px auto;border:0;width:36px;height:36px"></td>
<td style="padding-left:12px;color:#37342d;font-family:${SERIF};font-size:19px;line-height:1.2;letter-spacing:.2px">Test Sagar</td>
</tr></table></a></td>
<td align="right" style="color:#817b6d;font-family:${SANS};font-size:9px;line-height:1.4;letter-spacing:1.5px;text-transform:uppercase">Nursing test preparation</td>
</tr></table>
</td></tr>
<tr><td class="pad-x" style="padding:0 44px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:1px;background:#ddd5c7;font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>
<tr><td class="content pad-x" style="padding:39px 44px 38px;background:#fffefa">
<p style="margin:0 0 15px;color:${KICKER[tone]};font-family:${SANS};font-size:10px;font-weight:bold;line-height:1.4;letter-spacing:1.7px;text-transform:uppercase">${opts.badge}</p>
<h1 class="headline" style="margin:0;color:#332f28;font-family:${SERIF};font-size:32px;line-height:1.2;font-weight:normal;letter-spacing:-.35px">${opts.title}</h1>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 22px"><tr><td style="width:38px;height:2px;background:${RULE[tone]};font-size:0;line-height:0">&nbsp;</td></tr></table>
${opts.subtitle ? `<p style="margin:0 0 20px;color:#5d5a51;font-family:${SANS};font-size:15px;line-height:1.8">${opts.subtitle}</p>` : ""}
<div style="color:#5d5a51;font-family:${SANS};font-size:15px;line-height:1.8">${opts.body}</div>
<p style="margin:10px 0 0;padding-top:17px;border-top:1px solid #eae5dc;color:#858074;font-family:${SANS};font-size:11px;line-height:1.7">${opts.footnote ?? `Questions? Reply on <a href="${WHATSAPP}" style="color:#5c6447;text-decoration:underline">WhatsApp support</a> and our team will help.`}</p>
</td></tr>
<tr><td class="pad-x" style="padding:17px 44px 19px;background:#f6f3ed;border-top:1px solid #ebe5da"><p style="margin:0;color:#777267;font-family:${SANS};font-size:10px;line-height:1.6">Test Sagar <span style="color:#b5aa96">&nbsp;·&nbsp;</span> <a href="${SITE}" style="color:#777267;text-decoration:underline">tncnursing.site</a> <span style="color:#b5aa96">&nbsp;·&nbsp;</span> © ${new Date().getFullYear()}</p></td></tr>
</table></td></tr></table></body></html>`;
}
