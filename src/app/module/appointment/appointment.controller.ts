import type { NextFunction, Request, Response } from "express";
import http from "http-status"
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AppointmentServices } from "./appointment.service";

const bookAppointments = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{
    const payLoad = req.body;
    const user = req.user!;
    const result = await AppointmentServices.bookAppointments(payLoad, user);

    return sendResponse(res, {
        success : true,
        statusCode : http.OK,
        message : "Pay For your appointment confirmation.",
        data : result
    })
})


const bookAppointmentsCallBack = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{

    const { redirectUrl } = await AppointmentServices.bookAppointmentCallBack(req.query);

    res.redirect(redirectUrl)
})


const payAppointment = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{
    const payLoad = req.body;
    const user = req.user!;
    
    const result = await AppointmentServices.payAppointment(payLoad, user);

    return sendResponse(res, {
        success : true,
        statusCode : http.OK,
        message : "Pay For your appointment confirmation.",
        data : result
    })
})


const cancelAppointment = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{
    const payLoad = req.body;
    
    const result = await AppointmentServices.cancelAppointment(payLoad);

    return sendResponse(res, {
        success : true,
        statusCode : http.OK,
        message : "Your appointment is cancelled.",
        data : result
    })
})




export const AppointmentController = {
    bookAppointments,
    bookAppointmentsCallBack,
    payAppointment,
    cancelAppointment
}