import type{ NextFunction, Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

const uploadProfileImage = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{

    console.log(req.file, "This is the req.file")

    return sendResponse(res, {
        statusCode : status.OK,
        success : true,
        message : "",
        data : null
    })
})


export const UserController = {
    uploadProfileImage
}