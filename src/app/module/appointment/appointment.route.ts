import { Router } from "express";
import { AppointmentController } from "./appointment.controller";

const router = Router();

router.post('/book-appointment', AppointmentController.bookAppointments)

//? call back url of bkash
router.get('/book-appointment/payment/callback', AppointmentController.bookAppointmentsCallBack);

export const AppointmentRouter = router;