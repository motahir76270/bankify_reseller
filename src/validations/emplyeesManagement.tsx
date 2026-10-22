import { z } from "zod";


export const DEPARTMENT_CODE_OPTIONS = [
  "SALES",
  "MARKETING",
  "OPERATIONS",
  "FINANCE",
  "HR",
  "SUPPORT",
] as const;

export type EmployeesCode = (typeof DEPARTMENT_CODE_OPTIONS)[number];


export const departmentSchema = z.object({
  departmentCode: z.enum(DEPARTMENT_CODE_OPTIONS, {
    errorMap: () => ({ message: "Please select a role code" }),
  }),
  departmentName: z
    .string()
    .trim()
    .min(4, "Role name must be at least 4 characters"),
  departmentDescription: z
    .string()
    .trim()
    .min(10, "Role description must be at least 10 characters"),
});
export type DepartmentFormValues = z.infer<typeof departmentSchema>;

export const EmployessSchema = z.object({
  departmentId: z
    .string()
    .trim()
    .min(4, "Role name must be at least 4 characters"),
  email: z
    .string()
    .trim()
    .min(10, "Role description must be at least 10 characters"),
  employeeStatus: z
    .string()
    .trim()
    .min(10, "Role description must be at least 10 characters"),
  firstName: z
    .string()
    .trim()
    .min(10, "Role description must be at least 10 characters"),
  lastName: z
    .string()
    .trim()
    .min(10, "Role description must be at least 10 characters"),
  mobileNumber: z
    .string()
    .trim()
    .min(10, "Role description must be at least 10 characters"),  
});

export type EmployessFormValues = z.infer<typeof EmployessSchema>;

class EmplyeesManagementValidation {

 static get departmentSchema() {
    return departmentSchema;
  }

  static get employessSchema() {
    return EmployessSchema;
  }
}

export default EmplyeesManagementValidation;