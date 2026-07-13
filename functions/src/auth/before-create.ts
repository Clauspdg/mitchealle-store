import { beforeUserCreated } from "firebase-functions/v2/identity"

/**
 * Blocking function: attaches the default `role` custom claim before the
 * very first ID token is minted, so there is no propagation delay between
 * account creation and the claim being visible to proxy.ts / Server
 * Components. Requires Identity Platform to be enabled on the Firebase
 * project (see docs/technical-recommendations.md).
 */
export const beforeCreate = beforeUserCreated(() => {
  return {
    customClaims: {
      role: "customer",
    },
  }
})
