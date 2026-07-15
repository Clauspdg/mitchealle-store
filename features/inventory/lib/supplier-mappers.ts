import type { SupplierFormInput } from "@/schemas/supplier.schema"
import type { Supplier } from "@/types/supplier"

export function supplierToFormDefaults(supplier?: Supplier): SupplierFormInput {
  if (!supplier) {
    return {
      name: "",
      company: null,
      contactName: null,
      email: null,
      phone: null,
      country: null,
      address: null,
      currency: "USD",
      paymentTerms: null,
      averageLeadTimeDays: null,
      isActive: true,
      notes: null,
    }
  }

  return {
    name: supplier.name,
    company: supplier.company,
    contactName: supplier.contactName,
    email: supplier.email,
    phone: supplier.phone,
    country: supplier.country,
    address: supplier.address,
    currency: supplier.currency,
    paymentTerms: supplier.paymentTerms,
    averageLeadTimeDays: supplier.averageLeadTimeDays,
    isActive: supplier.isActive,
    notes: supplier.notes,
  }
}
