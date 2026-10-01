import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10 },
  header: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 700 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  tableHeader: { flexDirection: "row", borderBottom: "1 solid #e4e4e7", paddingBottom: 4, marginTop: 8 },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #f4f4f5", paddingVertical: 3 },
  col1: { width: "34%" },
  col: { width: "13.2%", textAlign: "right" },
  totalWrap: { marginTop: 10, alignItems: "flex-end" },
  total: { width: 220 },
});

export function InvoicePdf(props: {
  businessName: string;
  address?: string | null;
  phone?: string | null;
  invoiceNo: string;
  date: string;
  cashier: string;
  customer?: string | null;
  items: Array<{ name: string; sku: string; qty: number; unit: string; unitPrice: number; tax: number; discount: number; lineTotal: number }>;
  subTotal: number;
  tax: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{props.businessName}</Text>
          <Text>{props.address ?? ""}</Text>
          <Text>{props.phone ?? ""}</Text>
        </View>

        <View style={styles.row}>
          <Text>Invoice: {props.invoiceNo}</Text>
          <Text>Date: {props.date}</Text>
        </View>
        <View style={styles.row}>
          <Text>Cashier: {props.cashier}</Text>
          <Text>Customer: {props.customer ?? "Walk-in"}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Product</Text>
          <Text style={styles.col}>Qty</Text>
          <Text style={styles.col}>Unit</Text>
          <Text style={styles.col}>Price</Text>
          <Text style={styles.col}>Discount</Text>
          <Text style={styles.col}>Tax</Text>
          <Text style={styles.col}>Total</Text>
        </View>

        {props.items.map((item) => (
          <View key={`${item.sku}-${item.name}`} style={styles.tableRow}>
            <Text style={styles.col1}>{item.name} ({item.sku})</Text>
            <Text style={styles.col}>{item.qty}</Text>
            <Text style={styles.col}>{item.unit}</Text>
            <Text style={styles.col}>{item.unitPrice.toFixed(2)}</Text>
            <Text style={styles.col}>{item.discount.toFixed(2)}</Text>
            <Text style={styles.col}>{item.tax.toFixed(2)}</Text>
            <Text style={styles.col}>{item.lineTotal.toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.totalWrap}>
          <View style={styles.total}>
            <View style={styles.row}><Text>Subtotal</Text><Text>{props.subTotal.toFixed(2)}</Text></View>
            <View style={styles.row}><Text>Discount</Text><Text>{props.discount.toFixed(2)}</Text></View>
            <View style={styles.row}><Text>VAT/Tax</Text><Text>{props.tax.toFixed(2)}</Text></View>
            <View style={styles.row}><Text>Grand Total</Text><Text>{props.total.toFixed(2)}</Text></View>
            <View style={styles.row}><Text>Paid</Text><Text>{props.paid.toFixed(2)}</Text></View>
            <View style={styles.row}><Text>Due</Text><Text>{props.due.toFixed(2)}</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
