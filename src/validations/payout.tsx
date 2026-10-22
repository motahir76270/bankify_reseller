import { z } from "zod";

class payoutValidation {
  static get initiatePayoutSchema() {
    return z.object({
      amount: z
        .number()
        .positive("Amount must be greater than 0"),

      beneficiaryAccount: z
        .string()
        .min(6, "Account number must be at least 6 digits")
        .regex(/^\d+$/, "Account number must contain only digits"),

      beneficiaryBankName: z
        .string()
        .min(2, "Bank name is required"),

      beneficiaryIfsc: z
        .string()
        .regex(
          /^[A-Z]{4}0[A-Z0-9]{6}$/,
          "Please enter a valid IFSC code"
        ),

      beneficiaryMobile: z
        .string()
        .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),

      beneficiaryName: z
        .string()
        .min(2, "Beneficiary name must be at least 2 characters"),

      mode: z.enum(["IMPS", "NEFT", "RTGS"], {
        message: "Please select a valid payment mode",
      }),

      remarks: z
        .string()
        .max(200, "Remarks cannot exceed 200 characters")
        .optional()
        .default(""),
    });
  }
}

export default payoutValidation;