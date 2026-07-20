"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { slugify } from "@/utils/slug"
import {
  createProductAction,
  updateProductAction,
} from "@/features/catalog/actions/product-actions"
import { productToFormDefaults } from "@/features/catalog/lib/product-mappers"
import { ProductImageGallery } from "@/features/catalog/components/product-image-gallery"
import { ProductVariants } from "@/features/catalog/components/product-variants"
import {
  productFormSchema,
  type ProductFormInput,
} from "@/schemas/product.schema"
import { MoneyInput } from "@/components/shared/money-input"
import { TagsInput } from "@/components/shared/tags-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { Brand } from "@/types/brand"
import type { Category } from "@/types/category"
import type { Collection } from "@/types/collection"
import type { Product } from "@/types/product"

interface ProductFormProps {
  product?: Product
  categories: Category[]
  collections: Collection[]
  brands: Brand[]
}

export function ProductForm({
  product,
  categories,
  collections,
  brands,
}: ProductFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: productToFormDefaults(product),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form

  const name = watch("name")
  const slugPreview = slugify(name || "")

  async function onSubmit(data: ProductFormInput) {
    setSubmitting(true)
    try {
      const normalized: ProductFormInput = {
        ...data,
        images: data.images.map((image, index) => ({
          ...image,
          position: index,
        })),
      }

      const result = product
        ? await updateProductAction(product.id, normalized)
        : await createProductAction(normalized)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(product ? "Produit mis à jour." : "Produit créé.")
      router.push(`/admin/products/${result.data.id}`)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const isPreorderable = watch("isPreorderable")

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
        noValidate
      >
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="pricing">Prix</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="variants">Variantes</TabsTrigger>
            <TabsTrigger value="publication">Publication</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              )}
              {slugPreview && (
                <p className="text-muted-foreground text-xs">
                  Slug généré automatiquement : <code>{slugPreview}</code>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shortDescription">Description courte</Label>
              <Textarea
                id="shortDescription"
                rows={2}
                {...register("shortDescription")}
              />
              {errors.shortDescription && (
                <p className="text-destructive text-sm">
                  {errors.shortDescription.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description complète</Label>
              <Textarea
                id="description"
                rows={6}
                {...register("description")}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-destructive text-sm">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brand">Marque</Label>
                {brands.length > 0 ? (
                  <Select
                    value={watch("brandId") ?? "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setValue("brandId", null)
                        return
                      }
                      setValue("brandId", value)
                      setValue(
                        "brand",
                        brands.find((b) => b.id === value)?.name ?? null
                      )
                    }}
                  >
                    <SelectTrigger id="brand">
                      <SelectValue placeholder="Aucune" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune / texte libre</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                {!watch("brandId") ? (
                  <Input
                    value={watch("brand") ?? ""}
                    onChange={(event) =>
                      setValue("brand", event.target.value || null)
                    }
                    placeholder="Nom de la marque (texte libre)"
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  {...register("sku")}
                  aria-invalid={!!errors.sku}
                />
                {errors.sku && (
                  <p className="text-destructive text-sm">
                    {errors.sku.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upc">UPC / Code-barres</Label>
                <Input
                  id="upc"
                  value={watch("upc") ?? ""}
                  onChange={(event) =>
                    setValue("upc", event.target.value || null)
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="material">Matière</Label>
                <Input
                  id="material"
                  value={watch("material") ?? ""}
                  onChange={(event) =>
                    setValue("material", event.target.value || null)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="weightGrams">Poids (grammes)</Label>
                <Input
                  id="weightGrams"
                  type="number"
                  min="0"
                  value={watch("weightGrams") ?? ""}
                  onChange={(event) =>
                    setValue(
                      "weightGrams",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dimensionsCm">Dimensions (cm)</Label>
                <Input
                  id="dimensionsCm"
                  value={watch("dimensionsCm") ?? ""}
                  onChange={(event) =>
                    setValue("dimensionsCm", event.target.value || null)
                  }
                  placeholder="L × l × H"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="categoryId">Catégorie</Label>
                <Select
                  value={watch("categoryId")}
                  onValueChange={(value) => setValue("categoryId", value ?? "")}
                >
                  <SelectTrigger
                    id="categoryId"
                    aria-invalid={!!errors.categoryId}
                  >
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p className="text-destructive text-sm">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Collections</Label>
                <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-md border p-2">
                  {collections.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      Aucune collection.
                    </p>
                  )}
                  {collections.map((collection) => {
                    const selected = watch("collectionIds").includes(
                      collection.id
                    )
                    return (
                      <label
                        key={collection.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const current = form.getValues("collectionIds")
                            setValue(
                              "collectionIds",
                              checked
                                ? [...current, collection.id]
                                : current.filter((id) => id !== collection.id)
                            )
                          }}
                        />
                        {collection.name}
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tags</Label>
              <TagsInput
                value={watch("tags")}
                onChange={(tags) => setValue("tags", tags)}
                placeholder="Ajouter un tag..."
              />
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="costMinor">Coût</Label>
                <MoneyInput
                  id="costMinor"
                  valueMinor={watch("costMinor")}
                  onChangeMinor={(minor) => setValue("costMinor", minor)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="basePriceMinor">Prix</Label>
                <MoneyInput
                  id="basePriceMinor"
                  valueMinor={watch("basePriceMinor")}
                  onChangeMinor={(minor) =>
                    setValue("basePriceMinor", minor ?? 0)
                  }
                  aria-invalid={!!errors.basePriceMinor}
                />
                {errors.basePriceMinor && (
                  <p className="text-destructive text-sm">
                    {errors.basePriceMinor.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="salePriceMinor">Prix promotionnel</Label>
                <MoneyInput
                  id="salePriceMinor"
                  valueMinor={watch("salePriceMinor")}
                  onChangeMinor={(minor) => setValue("salePriceMinor", minor)}
                  aria-invalid={!!errors.salePriceMinor}
                />
                {errors.salePriceMinor && (
                  <p className="text-destructive text-sm">
                    {errors.salePriceMinor.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currency">Devise</Label>
                <Input
                  id="currency"
                  {...register("currency")}
                  placeholder="USD"
                  aria-invalid={!!errors.currency}
                />
                {errors.currency && (
                  <p className="text-destructive text-sm">
                    {errors.currency.message}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="images">
            <ProductImageGallery />
          </TabsContent>

          <TabsContent value="variants">
            <ProductVariants />
          </TabsContent>

          <TabsContent value="publication" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={watch("status")}
                onValueChange={(value) =>
                  setValue("status", value as ProductFormInput["status"])
                }
              >
                <SelectTrigger id="status" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isComingSoon"
                checked={watch("isComingSoon")}
                onCheckedChange={(checked) => setValue("isComingSoon", checked)}
              />
              <Label htmlFor="isComingSoon" className="font-normal">
                Produit à venir
              </Label>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="isPreorderable"
                  checked={isPreorderable}
                  onCheckedChange={(checked) =>
                    setValue("isPreorderable", checked)
                  }
                />
                <Label htmlFor="isPreorderable" className="font-normal">
                  Précommande activée
                </Label>
              </div>

              {isPreorderable && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label>Date estimée</Label>
                    <DatePicker
                      date={watch("availableFrom") ?? undefined}
                      onSelect={(date) =>
                        setValue("availableFrom", date ?? null)
                      }
                    />
                    {errors.availableFrom && (
                      <p className="text-destructive text-sm">
                        {errors.availableFrom.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="preorderMessage">Message client</Label>
                    <Textarea
                      id="preorderMessage"
                      rows={2}
                      value={watch("preorderMessage") ?? ""}
                      onChange={(event) =>
                        setValue("preorderMessage", event.target.value || null)
                      }
                      placeholder="Ex. Expédition prévue mi-août."
                    />
                  </div>
                </>
              )}
            </div>

            {!isPreorderable && watch("isComingSoon") && (
              <div className="flex flex-col gap-1.5">
                <Label>Date de disponibilité</Label>
                <DatePicker
                  date={watch("availableFrom") ?? undefined}
                  onSelect={(date) => setValue("availableFrom", date ?? null)}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="seo" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seoTitle">Meta Title</Label>
              <Input id="seoTitle" {...register("seo.title")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seoDescription">Meta Description</Label>
              <Textarea
                id="seoDescription"
                rows={3}
                {...register("seo.description")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Keywords</Label>
              <TagsInput
                value={watch("seo.keywords")}
                onChange={(keywords) => setValue("seo.keywords", keywords)}
                placeholder="Ajouter un mot-clé..."
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Enregistrement..."
              : product
                ? "Enregistrer"
                : "Créer le produit"}
          </Button>
          {product && (
            <Badge variant="secondary" className="ml-2">
              Dernière modification :{" "}
              {product.updatedAt.toDate().toLocaleString("fr-FR")}
            </Badge>
          )}
        </div>
      </form>
    </FormProvider>
  )
}
