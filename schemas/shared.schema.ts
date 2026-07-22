import { z } from "zod"

/** A nullable 6-digit hex color (`#0F172A`) — shared by every admin entity
 * with an optional "accent color" field (collections, categories...). */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale invalide (ex. #0F172A).")
  .nullable()
