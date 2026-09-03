import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";

//? seeding super admin
export const seedSuperAdmin = async () => {
	try {
		await prisma.$transaction(async (tx) => {
			const isSuperAdminExists = await tx.user.findFirst({
				where: {
					role: Role.SUPER_ADMIN,
				},
			});

			if (isSuperAdminExists) {
				console.log("Super Admin Already Exists");
				return;
			}

			const name = config.super_admin_name;
			const email = config.super_admin_email;
			const password = config.super_admin_password;

			if (!name || !email || !password) {
				throw new Error(
					"Super Admin Name, Email, Password Missing in the env file.",
				);
			}

			const hashedPassword = await bcrypt.hash(
				password,
				Number(config.bcrypt_salt_rounds),
			);

			const superAdmin = await tx.user.create({
				data: {
					name,
					email,
					password: hashedPassword,
					role: Role.SUPER_ADMIN,
					needPasswordChange: false,
					emailVerified: true,
				},
			});

			console.log("Super Admin Created : ", superAdmin);
		});
	} catch (error) {
		console.log("Error seeding super admin : ", error);
	}
};

//? seeding the tester admin
export const seedTesterAdmin = async () => {
	try {
		await prisma.$transaction(async (tx) => {
			const isTesterAdminExists = await tx.user.findUnique({
				where: {
					email: config.tester_admin_email,
				},
			});

			if (isTesterAdminExists) {
				console.log("Tester Admin Already Exists");
				return;
			}

			const name = config.tester_admin_name;
			const email = config.tester_admin_email;
			const password = config.tester_admin_password;

			if (!name || !email || !password) {
				throw new Error(
					"Tester Admin Name, Email, Password Missing in the env file.",
				);
			}

			const hashedPassword = await bcrypt.hash(
				password,
				Number(config.bcrypt_salt_rounds),
			);

			const testerAdmin = await tx.user.create({
				data: {
					name,
					email,
					password: hashedPassword,
					role: Role.ADMIN,
					needPasswordChange: false,
					emailVerified: true,
				},
			});

			console.log("Tester Admin Created : ", testerAdmin);
		});
	} catch (error) {
		console.log("Error seeding tester admin : ", error);
	}
};

//? seeding the tester doctor
export const seedTesterDoctor = async () => {
	try {
		await prisma.$transaction(async (tx) => {
			const isTesterDoctorExists = await tx.user.findUnique({
				where: {
					email: config.tester_doctor_email,
				},
			});

			if (isTesterDoctorExists) {
				console.log("Tester Doctor Already Exists");
				return;
			}

			const name = config.tester_doctor_name;
			const email = config.tester_doctor_email;
			const password = config.tester_doctor_password;

			if (!name || !email || !password) {
				throw new Error(
					"Tester Doctor Name, Email, Password Missing in the env file.",
				);
			}

			const hashedPassword = await bcrypt.hash(
				password,
				Number(config.bcrypt_salt_rounds),
			);

			const testerDoctor = await tx.user.create({
				data: {
					name,
					email,
					password: hashedPassword,
					role: Role.DOCTOR,
					needPasswordChange: false,
					emailVerified: true,
				},
			});

			console.log("Tester Doctor Created : ", testerDoctor);
		});
	} catch (error) {
		console.log("Error seeding tester doctor : ", error);
	}
};
