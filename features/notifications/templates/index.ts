import { clientEnv } from "@/lib/env.client"
import { LEGACY_CURRENCY } from "@/config/currency"
import { formatPriceMinor } from "@/utils/currency"
import {
  emailButton,
  emailLayout,
} from "@/features/notifications/templates/email-layout"
import type { Order } from "@/types/order"
import type { Coupon } from "@/types/coupon"
import type { Return } from "@/types/return"
import { translatorFor } from "@/i18n/dictionaries"
import type { Translator } from "@/i18n/translate"

export interface EmailTemplate {
  subject: string
  html: string
}

const APP_URL = clientEnv.NEXT_PUBLIC_APP_URL

/** An order's emails are in the language it was placed in; older orders
 * were placed on the French-only site. */
function orderI18n(order: Order): Translator {
  return translatorFor(order.locale, "fr")
}

function itemsListHtml(order: Order, { price }: Translator): string {
  return order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:4px 0;">${item.nameSnapshot} × ${item.quantity}</td>
          <td style="padding:4px 0;text-align:right;">${price(item.lineTotalMinor, order.currency)}</td>
        </tr>`
    )
    .join("")
}

export function renderWelcomeEmail(data: { name: string }): EmailTemplate {
  return {
    subject: "Bienvenue sur C.L.A.G",
    html: emailLayout(`
      <p>Bonjour ${data.name},</p>
      <p>Votre compte a bien été créé. Merci de nous rejoindre !</p>
      ${emailButton(`${APP_URL}/products`, "Découvrir la boutique")}
    `),
  }
}

export function renderOrderConfirmationEmail(order: Order): EmailTemplate {
  const i18n = orderI18n(order)
  const { t, price } = i18n
  const number = `<strong>${order.orderNumber}</strong>`
  return {
    subject: t("emails.confirmation.subject", { number: order.orderNumber }),
    html: emailLayout(
      `
      <p>${t("emails.hello")}</p>
      <p>${t("emails.confirmation.body", { number })}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        ${itemsListHtml(order, i18n)}
      </table>
      <p><strong>${t("emails.total", { amount: price(order.totalMinor, order.currency) })}</strong></p>
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, t("emails.viewOrder"))}
    `,
      i18n
    ),
  }
}

export function renderPaymentConfirmedEmail(order: Order): EmailTemplate {
  const i18n = orderI18n(order)
  const { t, price } = i18n
  const number = `<strong>${order.orderNumber}</strong>`
  const amount = `<strong>${price(order.totalMinor, order.currency)}</strong>`
  return {
    subject: t("emails.payment.subject", { number: order.orderNumber }),
    html: emailLayout(
      `
      <p>${t("emails.hello")}</p>
      <p>${t("emails.payment.body", { number })}</p>
      <p>${t("emails.payment.paid", { amount })}</p>
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, t("emails.viewOrder"))}
    `,
      i18n
    ),
  }
}

export function renderOrderShippedEmail(order: Order): EmailTemplate {
  const i18n = orderI18n(order)
  const { t } = i18n
  const tracking = order.delivery.trackingNumber
  const number = `<strong>${order.orderNumber}</strong>`
  return {
    subject: t("emails.shipped.subject", { number: order.orderNumber }),
    html: emailLayout(
      `
      <p>${t("emails.hello")}</p>
      <p>${t("emails.shipped.body", { number })}</p>
      ${tracking ? `<p>${t("emails.shipped.tracking", { tracking: `<strong>${tracking}</strong>` })}</p>` : ""}
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, t("emails.trackOrder"))}
    `,
      i18n
    ),
  }
}

export function renderOrderDeliveredEmail(order: Order): EmailTemplate {
  const i18n = orderI18n(order)
  const { t } = i18n
  const number = `<strong>${order.orderNumber}</strong>`
  return {
    subject: t("emails.delivered.subject", { number: order.orderNumber }),
    html: emailLayout(
      `
      <p>${t("emails.hello")}</p>
      <p>${t("emails.delivered.body", { number })}</p>
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, t("emails.viewOrder"))}
    `,
      i18n
    ),
  }
}

export function renderOrderRefundedEmail(order: Order): EmailTemplate {
  const i18n = orderI18n(order)
  const { t, price } = i18n
  const number = `<strong>${order.orderNumber}</strong>`
  const amount = `<strong>${price(order.totalMinor, order.currency)}</strong>`
  return {
    subject: t("emails.refunded.subject", { number: order.orderNumber }),
    html: emailLayout(
      `
      <p>${t("emails.hello")}</p>
      <p>${t("emails.refunded.body", { number, amount })}</p>
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, t("emails.viewOrder"))}
    `,
      i18n
    ),
  }
}

/** The text of the two order SMS, in the order's language. */
export function renderOrderSms(
  order: Order,
  type: "order_shipped" | "order_delivered"
): string {
  const { t } = orderI18n(order)
  return type === "order_shipped"
    ? t("emails.shipped.sms", { number: order.orderNumber })
    : t("emails.delivered.sms", { number: order.orderNumber })
}

export function renderCouponEmail(coupon: Coupon): EmailTemplate {
  const value =
    coupon.type === "percentage"
      ? `${coupon.value}%`
      : formatPriceMinor(coupon.value, coupon.currency ?? LEGACY_CURRENCY)
  return {
    subject: `Votre code promo ${coupon.code}`,
    html: emailLayout(`
      <p>Bonjour,</p>
      <p>Profitez de <strong>${value} de réduction</strong> avec le code :</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:2px;">${coupon.code}</p>
      ${emailButton(`${APP_URL}/products`, "En profiter")}
    `),
  }
}

/** A return's emails follow the language of its order; older orders were
 * placed on the French-only site. */
function returnI18n(locale: string | undefined): Translator {
  return translatorFor(locale, "fr")
}

export function renderReturnAcceptedEmail(
  returnRequest: Return,
  locale?: string
): EmailTemplate {
  const i18n = returnI18n(locale)
  const { t } = i18n
  return {
    subject: t("emails.returnAccepted.subject"),
    html: emailLayout(
      `
      <p>${t("emails.hello")}</p>
      <p>${t("emails.returnAccepted.body")}</p>
      ${emailButton(`${APP_URL}/account/returns/${returnRequest.id}`, t("emails.viewReturn"))}
    `,
      i18n
    ),
  }
}

/** `reason` is written by the store or the admin, and shown as written. */
export function renderReturnRejectedEmail(
  returnRequest: Return,
  reason: string | null,
  locale?: string
): EmailTemplate {
  const i18n = returnI18n(locale)
  const { t } = i18n
  return {
    subject: t("emails.returnRejected.subject"),
    html: emailLayout(
      `
      <p>${t("emails.hello")}</p>
      <p>${t("emails.returnRejected.body")}</p>
      <p>${t("emails.returnRejected.reason", { reason: reason ?? t("emails.returnRejected.noReason") })}</p>
      ${emailButton(`${APP_URL}/account/returns/${returnRequest.id}`, t("emails.viewReturn"))}
    `,
      i18n
    ),
  }
}

export function renderReturnRefundedEmail(
  returnRequest: Return,
  amountMinor: number,
  currency: string,
  locale?: string
): EmailTemplate {
  const i18n = returnI18n(locale)
  const { t, price } = i18n
  return {
    subject: t("emails.returnRefunded.subject"),
    html: emailLayout(
      `
      <p>${t("emails.hello")}</p>
      <p>${t("emails.returnRefunded.body", { amount: `<strong>${price(amountMinor, currency)}</strong>` })}</p>
      ${emailButton(`${APP_URL}/account/returns/${returnRequest.id}`, t("emails.viewReturn"))}
    `,
      i18n
    ),
  }
}

/**
 * Built, tested, ready — deliberately NOT wired into the live password-reset
 * flow. That flow already uses Firebase's own hosted reset email
 * (`sendPasswordResetEmail()`); switching to this template would mean
 * generating links via `generatePasswordResetLink()` and a custom
 * action-handler page, which is an authentication-mechanism change and is
 * explicitly out of scope for this sprint.
 */
export function renderPasswordResetEmail(data: {
  resetLink: string
}): EmailTemplate {
  return {
    subject: "Réinitialisation de votre mot de passe",
    html: emailLayout(`
      <p>Bonjour,</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      ${emailButton(data.resetLink, "Réinitialiser mon mot de passe")}
      <p style="color:#888888;font-size:12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
    `),
  }
}
