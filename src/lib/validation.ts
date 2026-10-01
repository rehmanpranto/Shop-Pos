import { z } from "zod";

export const paymentSplitSchema = z.object({
  accountId: z.string().min(1),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "MOBILE_FINANCIAL_SERVICE", "CHECK", "CREDIT_DUE", "OTHER"]),
  amount: z.number().positive(),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  unitId: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().positive(),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSplitSchema).min(1),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

export const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  unitId: z.string().min(1),
  qty: z.number().positive(),
  unitCost: z.number().positive(),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string(),
  supplierInvoiceNo: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]).default("RECEIVED"),
  items: z.array(purchaseItemSchema).min(1),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  shippingCost: z.number().min(0).default(0),
  otherCost: z.number().min(0).default(0),
  payments: z.array(paymentSplitSchema).default([]),
});

export const createRefundSchema = z.object({
  saleId: z.string(),
  reason: z.string().optional(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "MOBILE_FINANCIAL_SERVICE", "CHECK", "CREDIT_DUE", "OTHER"]),
  accountId: z.string().optional(),
  items: z
    .array(
      z.object({
        saleItemId: z.string(),
        qty: z.number().positive(),
      }),
    )
    .min(1),
});
