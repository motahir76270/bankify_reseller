import { z } from "zod";

export const ROLE_CODE_OPTIONS = [
  "STATE_HEAD",
  "MASTER_DISTRIBUTION",
  "DISTRIBUTION",
  "RETAILER",
] as const;

export type RoleCode = (typeof ROLE_CODE_OPTIONS)[number];

/* Define the schema ONCE outside the class so TS infers the type cleanly */
export const userRoleSchema = z.object({
  roleCode: z.enum(ROLE_CODE_OPTIONS, {
    errorMap: () => ({ message: "Please select a role code" }),
  }),
  roleName: z
    .string()
    .trim()
    .min(4, "Role name must be at least 4 characters"),
  roleDescription: z
    .string()
    .trim()
    .min(10, "Role description must be at least 10 characters"),
});

export type UserRoleFormValues = z.infer<typeof userRoleSchema>;

/* ---------------- Users ---------------- */
export const USER_STATUS_OPTIONS = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
] as const;

export type UserStatus = (typeof USER_STATUS_OPTIONS)[number];

export const usersSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
  roleId: z.string().min(1, "Please select a role"),
  userStatus: z.enum(USER_STATUS_OPTIONS, {
    errorMap: () => ({ message: "Please select a status" }),
  }),
});

export type UserFormValues = z.infer<typeof usersSchema>;

class UserManagementValidation {
  static get userRoleSchema() {
    return userRoleSchema;
  }

  static get usersSchema() {
    return userRoleSchema;
  }
}

export default UserManagementValidation;