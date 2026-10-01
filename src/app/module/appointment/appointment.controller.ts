import type { NextFunction, Request, Response } from "express";
import http from "http-status"
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AppointmentServices } from "./appointment.service";

const bookAppointments = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{
    const result = await AppointmentServices.bookAppointments();

    return sendResponse(res, {
        success : true,
        statusCode : http.OK,
        message : "Appointment Posted Successfully.",
        data : result
    })
})


const bookAppointmentsCallBack = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{

    const result = await AppointmentServices.bookAppointmentCallBack(req.query);

    return sendResponse(res, {
        success : true,
        statusCode : http.OK,
        message : "Appointment Posted Successfully.",
        data : result
    })
})


export const AppointmentController = {
    bookAppointments,
    bookAppointmentsCallBack
}