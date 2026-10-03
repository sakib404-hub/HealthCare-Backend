import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";


const applyAsDoctor = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{

    const resume = req.file;

    const additionalFiles = req.files;

    const data = req.body;

    console.log(resume, additionalFiles , data);


    return sendResponse(res, {
        success : true,
        statusCode : status.OK,
        message : "Application as Doctor Successfull",
        data : {}
    })
})

export const DoctorController = {
    applyAsDoctor
}