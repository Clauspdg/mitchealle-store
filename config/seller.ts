/**
 * The C.L.A.G house store. Every catalog or order document written before
 * multi-vendor support has no `sellerId` and resolves to this store at read
 * time, so historical data never needs rewriting.
 */
export const HOUSE_SELLER_ID = "clag-house"
