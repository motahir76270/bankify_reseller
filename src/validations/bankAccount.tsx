import { z } from "zod";

class BankAccountValiation {
  static get addBankSchema() {
    return z.object({
      accountHolderName: z
        .string()
        .min(2, "Account holder name is required"),
      accountNumber: z
        .string()
        .min(6, "Account number must be at least 6 digits")
        .regex(/^\d+$/, "Account number must contain only digits"),
      confirmAccountNumber: z.string().optional(),
      bankId: z.string().min(1, "Bank is required"),
      bankName: z.string().optional(),
      branchName: z.string().min(1, "Branch name is required"),
      ifscCode: z
        .string()
        .min(11, "IFSC code must be 11 characters")
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"),
      isPrimary: z.boolean().default(false),
      mobileNumber: z
        .string()
        .min(10, "Mobile number must be 10 digits")
        .regex(/^\d{10}$/, "Invalid mobile number"),
      upiId: z
        .string()
        .optional()
        .or(z.literal("")),
    });
  }
}

export default BankAccountValiation;