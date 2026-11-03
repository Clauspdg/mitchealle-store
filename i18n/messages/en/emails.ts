export const emails = {
  hello: "Hello,",
  viewOrder: "View my order",
  trackOrder: "Track my order",
  total: "Total: {amount}",
  viewReturn: "View my request",
  returnAccepted: {
    subject: "Your return request has been accepted",
    body: "Your return request for the related order has been <strong>accepted</strong>.",
  },
  returnRejected: {
    subject: "Your return request has been declined",
    body: "Your return request has been <strong>declined</strong>.",
    reason: "Reason: {reason}",
    noReason: "Not specified",
  },
  returnRefunded: {
    subject: "Your return has been refunded",
    body: "Your return has been refunded for an amount of {amount}.",
  },
  confirmation: {
    subject: "Order {number} received",
    body: "We've received your order {number}.",
  },
  payment: {
    subject: "Payment confirmed for order {number}",
    body: "Your payment for order {number} has been confirmed.",
    paid: "Amount paid: {amount}",
  },
  shipped: {
    subject: "Your order {number} is on its way",
    body: "Your order {number} has been shipped.",
    tracking: "Tracking number: {tracking}",
    sms: "Your order {number} has been shipped.",
  },
  delivered: {
    subject: "Your order {number} has been delivered",
    body: "Your order {number} has been delivered. We hope you love it!",
    sms: "Your order {number} has been delivered.",
  },
  refunded: {
    subject: "Order {number} refunded",
    body: "Your order {number} has been refunded for an amount of {amount}.",
  },
}
