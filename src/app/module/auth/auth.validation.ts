import z, { email } from "zod";

const PatientRegistratationZodSchema = z.object({
	name: z.string("Not a string"),
	email: z.string(),
	password: z
		.string()
		.min(8, "Password must be at least 8 character")
		.max(30, "Password can't be more than 30 character")
		.regex(/[A-Z]/, "Password must contain at least one Uppercase.")
		.regex(/[a-z]/, "Password must contain at least one Lowercase.")
		.regex(/[0-9]/, "Password must contain at least one number")
		.regex(
			/[^A-Za-z0-9]/,
			"Password must contain at least one special character.",
		),
	patient: z
		.object({
			contactNumber: z.string().optional(),
		})
		.optional(),
});

const PatientLoginZodSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

const ForgotPasswordSchema = z.object({
	email: z.email("Invalid Email Address!"),
});

const ResetPasswordSchema = z.object({
	email: z.email("Invalid Email Address!"),
	newPassword: z
		.string()
		.min(8, "Password must be at least 8 character")
		.max(30, "Password can't be more than 30 character")
		.regex(/[A-Z]/, "Password must contain at least one Uppercase.")
		.regex(/[a-z]/, "Password must contain at least one Lowercase.")
		.regex(/[0-9]/, "Password must contain at least one number")
		.regex(
			/[^A-Za-z0-9]/,
			"Password must contain at least one special character.",
		),
	otp: z.string().length(6),
});

export const AuthValidation = {
	PatientRegistratationZodSchema,
	PatientLoginZodSchema,
	ForgotPasswordSchema,
	ResetPasswordSchema,
};

export const UserValidation = AuthValidation;
