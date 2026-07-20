import path from "node:path"
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

import { siteConfig } from "@/config/site"
import { formatPriceMinor } from "@/utils/currency"
import type { Invoice } from "@/types/invoice"

const LOGO_PATH = path.join(process.cwd(), "public", "icons", "icon-512.png")

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  logo: { width: 48, height: 48 },
  siteName: { fontSize: 16, fontWeight: 700, marginTop: 8 },
  invoiceTitle: { fontSize: 18, fontWeight: 700, textAlign: "right" },
  metaText: { textAlign: "right", color: "#555555", marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#888888",
    marginBottom: 6,
  },
  addressLine: { marginBottom: 2 },
  table: { borderTop: "1px solid #dddddd", marginTop: 8 },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #eeeeee",
    paddingVertical: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #111111",
    paddingBottom: 6,
    fontWeight: 700,
  },
  colItem: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right" },
  totalsBlock: { marginTop: 16, alignItems: "flex-end" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 220,
    marginBottom: 4,
  },
  totalsLabel: { color: "#555555" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 220,
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #111111",
    fontWeight: 700,
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#999999",
    fontSize: 8,
  },
})

export function InvoicePdfDocument({ invoice }: { invoice: Invoice }) {
  const address = invoice.addressSnapshot

  return (
    <Document title={`Facture ${invoice.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop */}
            <Image src={LOGO_PATH} style={styles.logo} />
            <Text style={styles.siteName}>{siteConfig.name}</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FACTURE</Text>
            <Text style={styles.metaText}>{invoice.invoiceNumber}</Text>
            <Text style={styles.metaText}>
              {invoice.createdAt.toDate().toLocaleDateString("fr-FR")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          {address ? (
            <>
              <Text style={styles.addressLine}>{address.recipientName}</Text>
              <Text style={styles.addressLine}>
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
              </Text>
              <Text style={styles.addressLine}>
                {address.city}, {address.region} {address.postalCode ?? ""}
              </Text>
              <Text style={styles.addressLine}>{address.country}</Text>
              <Text style={styles.addressLine}>{address.phone}</Text>
            </>
          ) : null}
          <Text style={styles.addressLine}>{invoice.customerEmail}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colItem}>Produit</Text>
            <Text style={styles.colQty}>Qté</Text>
            <Text style={styles.colUnit}>Prix unitaire</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {invoice.items.map((item) => (
            <View
              key={`${item.productId}_${item.variantId}`}
              style={styles.tableRow}
            >
              <Text style={styles.colItem}>{item.nameSnapshot}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>
                {formatPriceMinor(item.unitPriceMinor, invoice.currency)}
              </Text>
              <Text style={styles.colTotal}>
                {formatPriceMinor(item.lineTotalMinor, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total</Text>
            <Text>
              {formatPriceMinor(invoice.subtotalMinor, invoice.currency)}
            </Text>
          </View>
          {invoice.discountMinor > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Réduction</Text>
              <Text>
                -{formatPriceMinor(invoice.discountMinor, invoice.currency)}
              </Text>
            </View>
          ) : null}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Livraison</Text>
            <Text>
              {formatPriceMinor(invoice.shippingFeeMinor, invoice.currency)}
            </Text>
          </View>
          {invoice.taxMinor > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Taxes</Text>
              <Text>
                {formatPriceMinor(invoice.taxMinor, invoice.currency)}
              </Text>
            </View>
          ) : null}
          <View style={styles.grandTotalRow}>
            <Text>Total</Text>
            <Text>
              {formatPriceMinor(invoice.totalMinor, invoice.currency)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {siteConfig.name} — {siteConfig.description}
        </Text>
      </Page>
    </Document>
  )
}
