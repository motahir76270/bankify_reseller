import { z } from "zod";

 class AuthValiation{
    static get loginSchema () {
        return z.object({
          identifier: z
            .string()
            .min(5, "UserId is required"),
          password: z
            .string()
            .min(1, "Password is required")
            .min(6, "Password must be at least 6 characters"),
        });
    }

   static get loginPIN () {
        return z.object({
          pin: z
            .string()
            .min(6, "PIN is required")
            .min(6, "PIN must be  6 characters"),
        });
    }

    static get registerSchema () {
        return z.object({
          email: z
            .string()
            .min(5, "Email or UserId is required"),
          password: z
            .string()
            .min(1, "Password is required")
            .min(6, "Password must be at least 6 characters"),
        });
    }

    static get changePasswordSchema (){
      return z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => val.length >= 8, {
      message: 'Password must be at least 8 characters',
    })
    .refine((val) => /[A-Z]/.test(val), {
      message: 'Password must contain at least one uppercase letter',
    })
    .refine((val) => /[a-z]/.test(val), {
      message: 'Password must contain at least one lowercase letter',
    })
    .refine((val) => /[0-9]/.test(val), {
      message: 'Password must contain at least one number',
    })
    .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
      message: 'Password must contain at least one special character',
    }),
  confirmPassword: z.string()
    .min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.newPassword !== data.oldPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});
    }

    
}

export default AuthValiation;