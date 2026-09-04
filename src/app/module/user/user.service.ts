import cloudinary from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";

const uploadProfileImage = async (buffer: Buffer, userId: string) => {
	const cloudinaryResult = await new Promise((resolve, reject) => {
		cloudinary.uploader
			.upload_stream({ resource_type: "auto" }, async (error, result) => {
				if (error) {
					return reject(error);
				}
				resolve(result);
			})
			.end(buffer);
	});

	await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			imageUrl: cloudinaryResult?.secure_url,
			imagePublicId: cloudinaryResult?.public_id,
		},
	});

	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		omit: {
			password: true,
		},
	});

	return user;
};

export const UserServices = {
	uploadProfileImage,
};
