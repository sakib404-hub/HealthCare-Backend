import { z } from "zod";

// 1. User Payload Schema
export const UserPayloadSchema = z.strictObject({
  name: z.string().min(1, "Name is required"),
  // In Zod v4, formats like email are top-level functions for tree-shaking
  email: z.email("Invalid email address"),
});

// 2. Doctor Payload Schema
export const DoctorPayloadSchema = z.strictObject({
  specialization: z.string().min(1, "Specialization is required"),
  licesnseNumber: z.string().min(1, "License number is required"), // Kept your exact schema spelling
  qualifications: z.string().min(1, "Qualifications are required"),
  experienceYears: z.number().int().nonnegative("Experience must be a positive number"),
  // consultationFee can be passed as a number or numeric string to match Prisma's Decimal
  consultationFee: z.number().min(0),
  bio: z.string().max(1000, "Bio cannot exceed 1000 characters").optional(),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
});

export const ApplyAsDoctorSchema = z.strictObject({
  user: UserPayloadSchema,
  doctor: DoctorPayloadSchema,
});

// Extract TypeScript types dynamically from the Zod v4 schemas
export type IApplyAsDoctorPayload = z.infer<typeof ApplyAsDoctorSchema>;
