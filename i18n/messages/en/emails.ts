export const emails = {
  hello: "Hello,",
  viewOrder: "View my order",
  trackOrder: "Track my order",
  total: "Total: {amount}",
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
