import { z } from "zod";

export const addBeneficiarySchema = z.object({
  accountNumber: z
    .string()
    .trim()
    .min(6, "Account number must be at least 6 digits")
    .regex(/^\d+$/, "Account number must contain only digits"),

  bankName: z.string().trim().min(2, "Bank name is required"),

  bankId: z.string().trim().min(1, "Please select a bank"),

  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z]{4}0[A-Z0-9]{6}$/,
      "Enter a valid IFSC code (e.g. SBIN0000001)"
    ),

  accountHolderName: z
    .string()
    .trim()
    .min(2, "Beneficiary name must be at least 2 characters"),
});

export type AddBeneficiaryFormValues = z.infer<typeof addBeneficiarySchema>;

const ExpressTransferValidation = {
  addBeneficiarySchema,
};

export default ExpressTransferValidation;