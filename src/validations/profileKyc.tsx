import { z } from 'zod';

const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;

class KycValidation {
  static get profileKYC() {
    return z.object({
      // ---------- Identity ----------
      pan: z
        .string()
        .trim()
        .min(1, 'PAN is required')
        .max(10, 'PAN must be 10 characters')
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g. ABCDE1234F)'),

      aadhaar: z
        .string()
        .trim()
        .min(1, 'Aadhaar number is required')
        .max(12, 'Aadhaar must be 12 digits')
        .regex(/^[2-9]\d{11}$/, 'Aadhaar must be 12 digits (cannot start with 0 or 1)'),

      // ---------- Personal ----------
      first_name: z
        .string()
        .trim()
        .min(1, 'First name is required')
        .max(50, 'First name cannot exceed 50 characters')
        .regex(NAME_REGEX, 'First name contains invalid characters'),

      last_name: z
        .string()
        .trim()
        .min(1, 'Last name is required')
        .max(50, 'Last name cannot exceed 50 characters')
        .regex(NAME_REGEX, 'Last name contains invalid characters'),

      father_name: z
        .string()
        .trim()
        .min(1, "Father's name is required")
        .max(100, "Father's name cannot exceed 100 characters")
        .regex(NAME_REGEX, "Father's name contains invalid characters"),

      dob: z
        .string()
        .min(1, 'Date of birth is required')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
        .refine(
          (val) => {
            const d = new Date(val);
            if (isNaN(d.getTime())) return false;
            const now = new Date();
            if (d > now) return false;
            const age =
              (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            return age >= 18;
          },
          { message: 'You must be at least 18 years old' },
        ),

      gender: z
        .string()
        .min(1, 'Gender is required')
        .refine((v) => ['male', 'female', 'other'].includes(v), {
          message: 'Gender must be male, female or other',
        }),

      // ---------- Address ----------
      address: z
        .string()
        .trim()
        .min(1, 'Address is required')
        .max(250, 'Address cannot exceed 250 characters'),

      pinCode: z
        .string()
        .trim()
        .min(1, 'PIN code is required')
        .max(6, 'PIN code must be 6 digits')
        .regex(/^[1-9][0-9]{5}$/, 'PIN code must be 6 digits (cannot start with 0)'),

      state: z.string().min(1, 'State is required'), // stores stateId
      city: z.string().min(1, 'City is required'),   // stores cityId

      // ---------- Documents (local file URIs) ----------
      pan_document:       z.string().min(1, 'PAN document is required'),
      aadhaar_front_doc:  z.string().min(1, 'Aadhaar front is required'),
      aadhaar_back_doc:   z.string().min(1, 'Aadhaar back is required'),
      address_proof_doc:  z.string().min(1, 'Address proof is required'),
      user_photo_doc:     z.string().min(1, 'User photo is required'),
    });
  }
}

export type ProfileKycFormValues = z.infer<
  ReturnType<typeof KycValidation.profileKYC.parse> extends never ? never : any
>;

export default KycValidation;