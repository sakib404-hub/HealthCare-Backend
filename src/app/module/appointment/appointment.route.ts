import { Router } from "express";
import { AppointmentController } from "./appointment.controller";

const router = Router();

router.post('/book-appointment', AppointmentController.bookAppointments)

//? call back url of bkash
router.post('/book-appointment/payment/callback', ()=>{});

export const AppointmentRouter = router;