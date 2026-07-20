import { z } from "zod"

import { BANNER_PLACEMENTS } from "@/types/banner"

export const bannerFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "Le titre est requis.")
      .max(120, "120 caractères maximum."),
    imageUrl: z.string().min(1, "Une image est requise."),
    linkUrl: z.string().nullable(),
    placement: z.enum(BANNER_PLACEMENTS),
    startAt: z.date().nullable(),
    endAt: z.date().nullable(),
    isActive: z.boolean(),
    position: z.number().int().min(0),
    eyebrow: z.string().nullable(),
    subtitle: z.string().nullable(),
    primaryButtonLabel: z.string().nullable(),
    primaryButtonHref: z.string().nullable(),
    secondaryButtonLabel: z.string().nullable(),
    secondaryButtonHref: z.string().nullable(),
  })
  .refine((data) => !data.startAt || !data.endAt || data.startAt < data.endAt, {
    message: "La date de fin doit être après la date de début.",
    path: ["endAt"],
  })

export type BannerFormInput = z.infer<typeof bannerFormSchema>
