import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	validateRequest(UserValidation.PatientRegistratationZodSchema),
	AuthController.registerPatient,
);

router.post(
	"/login",
	validateRequest(UserValidation.PatientLoginZodSchema),
	AuthController.loginUser,
);

router.get(
	"/me",
	auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	AuthController.getMe,
);

router.post("/google", AuthController.googleLogin);

router.post("/refresh-token", AuthController.refreshToken);

router.post(
	"/forgot-password",
	validateRequest(UserValidation.ForgotPasswordSchema),
	AuthController.forgotPassword,
);

router.post(
	"/reset-password",
	validateRequest(UserValidation.ResetPasswordSchema),
	AuthController.resetPassword,
);

export const AuthRoutes = router;
