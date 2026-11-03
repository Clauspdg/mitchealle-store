import { z } from "zod"

// Messages are dictionary keys: forms show them in the visitor's language.
const email = z
  .string()
  .min(1, "validation.emailRequired")
  .email("validation.emailInvalid")

const password = z
  .string()
  .min(8, "validation.passwordTooShort")
  .max(72, "validation.passwordTooLong")

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "validation.passwordRequired"),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, "validation.nameTooShort")
      .max(80, "validation.nameTooLong"),
    email,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((value) => value === true, {
      error: "validation.acceptTerms",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordsDontMatch",
    path: ["confirmPassword"],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email,
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
