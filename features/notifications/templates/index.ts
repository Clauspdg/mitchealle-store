import { clientEnv } from "@/lib/env.client"
import { formatPriceMinor } from "@/utils/currency"
import {
  emailButton,
  emailLayout,
} from "@/features/notifications/templates/email-layout"
import type { Order } from "@/types/order"
import type { Coupon } from "@/types/coupon"
import type { Return } from "@/types/return"

export interface EmailTemplate {
  subject: string
  html: string
}

const APP_URL = clientEnv.NEXT_PUBLIC_APP_URL

function itemsListHtml(order: Order): string {
  return order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:4px 0;">${item.nameSnapshot} × ${item.quantity}</td>
          <td style="padding:4px 0;text-align:right;">${formatPriceMinor(item.lineTotalMinor, order.currency)}</td>
        </tr>`
    )
    .join("")
}

export function renderWelcomeEmail(data: { name: string }): EmailTemplate {
  return {
    subject: "Bienvenue chez Mitchaella Store",
    html: emailLayout(`
      <p>Bonjour ${data.name},</p>
      <p>Votre compte a bien été créé. Merci de nous rejoindre !</p>
      ${emailButton(`${APP_URL}/products`, "Découvrir la boutique")}
    `),
  }
}

export function renderOrderConfirmationEmail(order: Order): EmailTemplate {
  return {
    subject: `Commande ${order.orderNumber} reçue`,
    html: emailLayout(`
      <p>Bonjour,</p>
      <p>Nous avons bien reçu votre commande <strong>${order.orderNumber}</strong>.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        ${itemsListHtml(order)}
      </table>
      <p><strong>Total : ${formatPriceMinor(order.totalMinor, order.currency)}</strong></p>
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, "Voir ma commande")}
    `),
  }
}

export function renderPaymentConfirmedEmail(order: Order): EmailTemplate {
  return {
    subject: `Paiement confirmé pour la commande ${order.orderNumber}`,
    html: emailLayout(`
      <p>Bonjour,</p>
      <p>Votre paiement pour la commande <strong>${order.orderNumber}</strong> a bien été confirmé.</p>
      <p>Total réglé : <strong>${formatPriceMinor(order.totalMinor, order.currency)}</strong></p>
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, "Voir ma commande")}
    `),
  }
}

export function renderOrderShippedEmail(order: Order): EmailTemplate {
  const tracking = order.delivery.trackingNumber
  return {
    subject: `Votre commande ${order.orderNumber} est en route`,
    html: emailLayout(`
      <p>Bonjour,</p>
      <p>Votre commande <strong>${order.orderNumber}</strong> a été expédiée.</p>
      ${tracking ? `<p>Numéro de suivi : <strong>${tracking}</strong></p>` : ""}
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, "Suivre ma commande")}
    `),
  }
}

export function renderOrderDeliveredEmail(order: Order): EmailTemplate {
  return {
    subject: `Votre commande ${order.orderNumber} a été livrée`,
    html: emailLayout(`
      <p>Bonjour,</p>
      <p>Votre commande <strong>${order.orderNumber}</strong> a été livrée. Nous espérons qu'elle vous plaira !</p>
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, "Voir ma commande")}
    `),
  }
}

export function renderOrderRefundedEmail(order: Order): EmailTemplate {
  return {
    subject: `Commande ${order.orderNumber} remboursée`,
    html: emailLayout(`
      <p>Bonjour,</p>
      <p>Votre commande <strong>${order.orderNumber}</strong> a été remboursée pour un montant de
      <strong>${formatPriceMinor(order.totalMinor, order.currency)}</strong>.</p>
      ${emailButton(`${APP_URL}/account/orders/${order.id}`, "Voir ma commande")}
    `),
  }
}

export function renderCouponEmail(coupon: Coupon): EmailTemplate {
  const value =
    coupon.type === "percentage"
      ? `${coupon.value}%`
      : formatPriceMinor(coupon.value, "HTG")
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

export function renderReturnAcceptedEmail(
  returnRequest: Return
): EmailTemplate {
  return {
    subject: "Votre demande de retour a été acceptée",
    html: emailLayout(`
      <p>Bonjour,</p>
      <p>Votre demande de retour pour la commande liée a été <strong>acceptée</strong>.</p>
      ${emailButton(`${APP_URL}/account/returns/${returnRequest.id}`, "Voir ma demande")}
    `),
  }
}

export function renderReturnRejectedEmail(
  returnRequest: Return,
  reason: string
): EmailTemplate {
  return {
    subject: "Votre demande de retour a été refusée",
    html: emailLayout(`
      <p>Bonjour,</p>
      <p>Votre demande de retour a été <strong>refusée</strong>.</p>
      <p>Motif : ${reason}</p>
      ${emailButton(`${APP_URL}/account/returns/${returnRequest.id}`, "Voir ma demande")}
    `),
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
