import { z } from "zod";

export const WALLET_TRANSFER_TYPES = [
  "credit",
  "debit",
  "release",
  "block",
] as const;

export type WalletTransferType = (typeof WALLET_TRANSFER_TYPES)[number];

export const walletTransferSchema = z
  .object({
    type: z.enum(WALLET_TRANSFER_TYPES, {
      message: "Please select a transfer type",
    }),

    amount: z
      .string()
      .trim()
      .min(1, "Amount is required")
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 200 or 200.50)"),

    reference: z.string().trim().max(120, "Reference is too long"),
  })
  .superRefine((data, ctx) => {
    const amount = Number(data.amount);

    // Amount required for credit / debit
    if (
      (data.type === "credit" || data.type === "debit") &&
      (!data.amount || amount <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Amount must be greater than 0",
      });
    }

    // Reference required for credit / debit / release
    if (
      (data.type === "credit" ||
        data.type === "debit" ||
        data.type === "release") &&
      data.reference.length < 3
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reference"],
        message: "Reference must be at least 3 characters",
      });
    }
  });

export type WalletTransferFormValues = z.infer<typeof walletTransferSchema>;