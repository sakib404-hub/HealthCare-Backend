import type { UploadApiResponse } from "cloudinary";
import cloudinary from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";

const applyAsDoctor = async (
  payLoad: any,
  resume: Express.Multer.File | null,
  additionalFiles: Express.Multer.File[]
) => {
  const email = payLoad.email;

  const isUserExist = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (isUserExist) {
    throw new Error("User with this email Already Exists.");
  }

  //? uploading resume and additional files
  const resumeResult = await new Promise<UploadApiResponse>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: "auto" }, async (error, result) => {
          if (error) {
            return reject(error);
          }
          if (result === undefined) {
            return reject(new Error("No result returned from cloudinary."));
          }
          resolve(result);
        })
        .end(resume?.buffer);
    }
  );
  const additionalFilesResult = await Promise.all(
    additionalFiles.map((file) => {
      return new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ resource_type: "auto" }, async (error, result) => {
            if (error) {
              return reject(error);
            }
            if (result === undefined) {
              return reject(new Error("No result returned from cloudinary."));
            }
            resolve(result);
          })
          .end(file?.buffer);
      });
    })
  );
};

export const DoctorServices = {
  applyAsDoctor,
};
