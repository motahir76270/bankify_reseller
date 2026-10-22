import { z } from "zod";

 class AddFundValiation{
static get addFundSchema() {
  return z.object({
    amount: z
      .number()
      .positive("Amount must be greater than 0"),

    paymentMode: z
      .string()
      .min(1, "Payment mode is required"),

    providerTxnId: z
      .string()
      .min(1, "Provider transaction ID is required"),
    imageUrl: z
      .any()
      .optional(),
  });
}

    
}

export default AddFundValiation;