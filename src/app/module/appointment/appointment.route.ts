import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppointmentController } from "./appointment.controller";

const router = Router();

//? create and pay for your appointment 
router.post('/book-appointment', auth(Role.PATIENT), AppointmentController.bookAppointments)

//? paying an existing appointment
router.post('/pay-appointment', auth(Role.PATIENT), AppointmentController.payAppointment);


//? call back url of bkash
router.get('/book-appointment/payment/callback', AppointmentController.bookAppointmentsCallBack);


export const AppointmentRouter = router;