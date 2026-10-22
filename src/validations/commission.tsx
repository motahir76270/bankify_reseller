import { z } from "zod";

class CommissionValidation {
  static get addCommissionRuleSchema() {
    return z.object({
      accountHolderName: z
        .string()
        .min(2, "Account holder name is required")
        .optional(),
      accountNumber: z
        .string()
        .min(6, "Account number must be at least 6 digits")
        .regex(/^\d+$/, "Account number must contain only digits")
        .optional(),
      applyGST: z.boolean().optional(),
      applyTDS: z.boolean().optional(),
      gstPercent: z.number().min(0).max(100).optional(),
      isActive: z.boolean().optional(),
      mode: z.enum(["COMMISSION"]).optional(),
      roleId: z.string().uuid("Invalid role ID").optional().nullable(),
      scope: z.enum(["ROLE", "USER", "GLOBAL"]).optional(),
      serviceProviderMappingId: z
        .string()
        .uuid("Invalid service provider mapping ID")
        .optional()
        .nullable(),
      slabs: z
        .array(
          z.object({
            minAmount: z.number().nonnegative(),
            maxAmount: z.number().nonnegative(),
            value: z.number().nonnegative(),
          })
        )
        .optional(),
      supportsSlab: z.boolean().optional(),
      targetUserId: z.string().uuid("Invalid target user ID").optional().nullable(),
      tdsPercent: z.number().min(0).max(100).optional(),
      type: z.enum(["FLAT", "PERCENTAGE"]).optional(),
      value: z.number().nonnegative().optional().nullable(),
    });
  }
}

export default CommissionValidation;