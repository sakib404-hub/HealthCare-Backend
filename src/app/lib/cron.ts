import cron from "node-cron";
import { DoctorVerificationStatus, Role } from "../../generated/prisma/enums";
import { prisma } from "./prisma";

export const deleteUnverifiedDoctors = async () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      //? this is where prisma business logic will be executed
      //? unverified doctor will be deleted
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const deletedDoctors = await prisma.user.deleteMany({
        where: {
          role: Role.DOCTOR,
          emailVerified: false,
          createdAt: {
            lt: oneHourAgo,
          },
          doctor: {
            verifactionStatus: DoctorVerificationStatus.PENDING,
          },
        },
      });

      if (deletedDoctors.count > 0) {
        console.log(
          `Cron Deleted ${deletedDoctors.count} unverified Email Verification older than one hours.`
        );
      }
    } catch (error) {
      console.log(`Cron : Failed to Delete Unverfied doctor applications`, error);
    }

    console.log("Cron Schedule for Doctor Delete in every 10 minutes");
  });
};
