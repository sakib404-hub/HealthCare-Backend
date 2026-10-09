import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ScheduleController } from "./schedule.controller";
import {
	createScheduleZodSchema,
	updateScheduleZodSchema,
} from "./schedule.validation";

const router = Router();

router.post(
	"/create-schedule",
	auth(Role.DOCTOR),
	validateRequest(createScheduleZodSchema),
	ScheduleController.createSchedule,
);

router.get(
	"/my-schedule",
	auth(Role.DOCTOR),
	ScheduleController.getMySchedules,
);

router.get(
	"/all-schedules",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ScheduleController.getAllSchedules,
);

router.get(
	"/todays-schedules",
	auth(Role.PATIENT),
	ScheduleController.getTodaysSchedule,
);

router.patch(
	"/update-schedule/:scheduleId",
	auth(Role.DOCTOR),
	validateRequest(updateScheduleZodSchema),
	ScheduleController.updateSchedule,
);

router.patch(
	"/publish-schedule/:scheduleId",
	auth(Role.DOCTOR),
	ScheduleController.publishSchedule,
);

router.get(
	"/:scheduleId",
	auth(Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
	ScheduleController.getScheduleById,
);

router.delete(
	"/:scheduleId",
	auth(Role.DOCTOR),
	ScheduleController.deleteScheduleById,
);

export const ScheduleRouter = router;
