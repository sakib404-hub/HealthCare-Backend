import type { NextFunction, Request, Response } from "express";
import http from "http-status"
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

const bookAppointments = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{


    return sendResponse(res, {
        success : true,
        statusCode : http.OK,
        message : "Appointment Posted Successfully.",
        data : {}
    })
})


export const appointmentController = {
    bookAppointments
}