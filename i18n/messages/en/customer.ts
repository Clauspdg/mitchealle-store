export const refunds = {
  title: "Refunds",
  reference: "Reference: {reference}",
  source: {
    store_cancellation: "Cancelled by the store",
    store_return: "Returned items",
    house_return: "Returned C.L.A.G items",
    order_refund: "Order refund",
  },
  status: {
    requested: "Refund requested",
    pending: "Refund pending",
    completed: "Refund completed",
    void: "No refund",
  },
  hint: {
    requested: "The return still has to be received and checked.",
    pending: "The amount is owed to you and hasn't been refunded yet.",
    completed: "The refund has been recorded as completed.",
    void: "Nothing is owed for this request.",
  },
}

export const returns = {
  title: "My returns",
  emptyTitle: "No return requests",
  emptyText: "Your return requests will appear here.",
  detailMetaTitle: "Return details",
  detailTitle: "Return request",
  status: {
    requested: "Requested",
    approved: "Approved",
    rejected: "Declined",
    received: "Received",
    refunded: "Refunded",
  },
  quantity: "Quantity: {count}",
  reason: "Reason: {reason}",
  comment: "Comment:",
  request: "Request a return",
  requestText: "Select the items concerned and give a reason.",
  quantityToReturn: "Quantity to return",
  reasonPlaceholder: "Reason for the return",
  commentLabel: "Comment (optional)",
  photoLabel: "Photo (optional)",
  photoAdded: "Photo added.",
  send: "Send the request",
  sent: "Return request sent.",
  selectItem: "Select at least one item.",
  reasonForEach: "Give a reason for each selected item.",
  reasonRequired: "Give a reason.",
  onlyDelivered: "Only a delivered order can be returned.",
  itemNotReturnable: "An item in the request can't be returned.",
}

export const wishlist = {
  emptyTitle: "Your wishlist is empty",
  emptyText: "Add products from the catalog by clicking the heart.",
}

export const sellerApply = {
  intro:
    "Ask to open your store. Your customer account stays the same throughout.",
  mine: "My applications",
  status: {
    pending: "Pending",
    approved: "Approved",
    rejected: "Declined",
  },
  statusText: {
    pending:
      "Our team is reviewing your application. You can send a new one once it has been processed.",
    approved:
      "Your store is open: manage your catalog and stock from the Seller Center.",
    rejected: "Your application was not accepted.",
  },
  submittedOn: "Submitted on {date}",
  newApplication: "New application",
  yourApplication: "Your application",
  yourStore: "Your store",
  storeName: "Store name",
  descriptionPlaceholder: "What you sell, your know-how, where you operate…",
  mainCategory: "Main category",
  chooseCategoryPlaceholder: "Choose a category",
  chooseCategory: "Choose the main category.",
  logo: "Logo (optional)",
  logoHint: "JPEG, PNG, WebP or AVIF, 5 MB maximum.",
  businessContact: "Business contact details",
  legalName: "Company or legal name",
  businessEmail: "Business email",
  submit: "Send my application",
  sent: "Application sent.",
  checkForm: "Please check the form.",
  alreadyPending: "You already have an application under review.",
  saveFailed: "Your application couldn't be saved. Please try again.",
  nameTaken: "This store name is already taken.",
  nameInvalid: "The store name isn't valid.",
  categoryMissing: "Category not found.",
}

export const compare = {
  title: "Compare",
  emptyTitle: "No products to compare",
  emptyText:
    "Add products to the comparison from the catalog to see them here.",
  browse: "Browse products",
  price: "Price",
  sizes: "Sizes",
  colors: "Colors",
  availability: "Availability",
}

/** The text these pages ship with, until an admin writes their own. */
export const content = {
  about: {
    menuTitle: "About",
    title: "About C.L.A.G",
    p1: "C.L.A.G is an online store dedicated to a demanding selection of timeless pieces. Every product in our catalog is chosen for its craftsmanship, its fine materials and its durability — far from passing trends.",
    p2: "We believe a premium shopping experience isn't limited to the product: it carries on through presentation, delivery and after-sales service. This standard guides each of our decisions, from choosing our suppliers to designing this site.",
    p3: "Our team remains available to answer any question about our collections, the availability of an item or the tracking of an order.",
  },
  contact: {
    title: "Contact",
    p1: "Our team is available to answer any question about your orders, our products or your account.",
  },
  shippingReturns: {
    title: "Shipping & Returns",
    deliveryTitle: "Delivery",
    deliveryText:
      "Two options are offered at checkout: in-store pickup, free of charge, or home delivery at a flat rate. The exact amount of each option is shown before you confirm your order.",
    returnsTitle: "Returns",
    returnsText:
      "Unworn items in their original packaging can be returned within 30 days of receiving your order. Contact our customer service to start a return request.",
    refundsTitle: "Refunds",
    refundsText:
      "Once the return is received and checked, the refund is issued to the original payment method within a few business days.",
  },
  faq: {
    title: "Frequently asked questions",
    q1: "What are the delivery times?",
    a1: "Orders are usually shipped within 1 to 3 business days. Delivery time then depends on the option chosen at checkout.",
    q2: "Can I change or cancel my order?",
    a2: "Contact us as soon as possible after your purchase — as long as the order hasn't been shipped, we can usually change or cancel it.",
    q3: "How do I track my order?",
    a3: "Go to “My account” then “My orders” to see the status and history of each order.",
    q4: "Which payment methods do you accept?",
    a4: "Card payments are accepted through a secure payment gateway at checkout.",
    q5: "How can I contact you?",
    a5: "Our customer service team is available by email — see the “Shipping & Returns” page for questions about orders already placed.",
  },
  legal: {
    metaTitle: "Privacy & Terms",
    frenchOnly:
      "This page is only available in French for now. It is shown here as published.",
  },
}
