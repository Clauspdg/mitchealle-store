import { siteConfig } from "@/config/site"
import type { Translator } from "@/i18n/translate"

/**
 * Shared wrapper for every transactional email — table-based layout with
 * inline styles, the standard approach for cross-email-client compatibility
 * (most clients strip <style> blocks and don't support flexbox/grid).
 * Responsive via a simple max-width table, which degrades gracefully on
 * mobile mail clients without needing media queries.
 *
 * Without a translator (emails not translated yet), the page stays French.
 */
export function emailLayout(
  bodyHtml: string,
  i18n?: Pick<Translator, "t" | "locale">
): string {
  return `<!doctype html>
<html lang="${i18n?.locale ?? "fr"}">
  <body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#171717;padding:24px;text-align:center;">
                <span style="color:#ffffff;font-size:20px;font-weight:600;">${siteConfig.name}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px;color:#111111;font-size:14px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background-color:#fafafa;text-align:center;color:#888888;font-size:12px;">
                ${siteConfig.name} — ${i18n ? i18n.t("shell.store.description") : siteConfig.description}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#171717;border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${label}</a>
      </td>
    </tr>
  </table>`
}
