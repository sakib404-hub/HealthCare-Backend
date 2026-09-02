import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	(req: Request, res: Response, next: NextFunction) => {
		try {
			const payLoad = req.body ?? {};

			const result =
				UserValidation.PatientRegistratationZodSchema.safeParse(payLoad);

			if (!result.success) {
				throw new Error(result.error.issues[0].message);
			}

			//? assigning the body again
			req.body = result.data;
			next();
		} catch (err) {
			next(err);
		}
	},
	AuthController.registerPatient,
);

router.post("/login", AuthController.loginUser);

router.get(
	"/me",
	auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	AuthController.getMe,
);

router.post("/google", AuthController.googleLogin);

router.post("/refresh-token", AuthController.refreshToken);
export const AuthRoutes = router;
