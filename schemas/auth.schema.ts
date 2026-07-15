import { z } from "zod"

const email = z
  .string()
  .min(1, "L'email est requis.")
  .email("Adresse email invalide.")

const password = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(72, "Le mot de passe est trop long.")

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Le mot de passe est requis."),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères.")
      .max(80, "Le nom est trop long."),
    email,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((value) => value === true, {
      error: "Vous devez accepter les conditions d'utilisation.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email,
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
