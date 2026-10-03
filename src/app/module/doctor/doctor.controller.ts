import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";


const applyAsDoctor = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{

    const files = req.files as { [fieldname : string] : Express.Multer.File[]};

    const resume = files.resume ? files.resume[0] : null;
    const additionalFiles = files.additionalFiles ? files.additionalFiles : null;

    const data = JSON.parse(req.body.data);

    console.log({resume, additionalFiles , data});


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