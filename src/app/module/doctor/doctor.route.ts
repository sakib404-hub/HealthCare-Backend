import { Router } from "express";
import upload from "../../lib/multer";
import { DoctorController } from "./doctor.controller";

const router = Router();

router.post(
	"/apply-as-doctor",
	upload.fields([
		{ name: "resume", maxCount: 1 },
		{ name: "additionalFiles", maxCount: 10 },
	]),
	DoctorController.applyAsDoctor,
);

router.post('/apply-as-doctor/verify-email', DoctorController.verifyEmail);

export const DoctorRouter = router;
