import { Router } from "express";
import { appointmentController } from "./appointment.controller";

const router = Router();

router.post('/book-appointments', appointmentController.bookAppointments)

export const AppointmentRouter = Router;