import { DoctorVerificationStatus } from "../../../generated/prisma/enums";

export interface IUserPayload {
	name: string;
	email: string;
	password?: string;
	googleId?: string;
	authProvider?: "CREDENTIAL" | "GOOGLE"; // Adjust based on your AuthProvider enum
	emailVerified?: boolean;
	role?: "PATIENT" | "DOCTOR" | "ADMIN"; // Adjust based on your Role enum
	status?: "ACTIVE" | "BLOCKED"; // Adjust based on your UserStatus enum
	needPasswordChange?: boolean;
	imageUrl?: string;
	imagePublicId?: string;
}

// Interface for the 'doctor' object inside the payload
export interface IDoctorPayload {
	specialization: string;
	licesnseNumber: string; // Keeps the schema's specific spelling 'licesnseNumber'
	qualifications: string;
	experienceYears: number;
	consultationFee?: number | string; // Handled as Decimal by Prisma, incoming as number/string
	bio?: string;
	contactNumber?: string;
	address?: string;
}

// The master interface for the service payload parameter
export interface IApplyAsDoctorPayload {
	user: IUserPayload;
	doctor: IDoctorPayload;
}

export interface VerifyDoctorEmail {
	otp: string;
	email: string;
}

export interface IApproveDoctorPayLoad {
	doctorId: string;
	verificationStatus: DoctorVerificationStatus;
	rejectionReason?: string;
}

//? for the query perams
export interface IQuery   {
	searchTerm ? : string;
	page ? : string ;
	limit ? : string;
	sortOrder ? : string;
	sortBy ? : string;

	//? any other filter or query perameter is added here
	[key : string]  : any;
}
