import type{ NextFunction, Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserServices } from "./user.service";

const uploadProfileImage = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{

    if(!req.file){
        throw new Error("No File Provided.");
    }
    

    const userId = req.user?.userId;
    const buffer = req.file?.buffer;

    const result = await UserServices.uploadProfileImage(buffer as Buffer, userId as string);

    return sendResponse(res, {
        statusCode : status.OK,
        success : true,
        message : "Your Image Updated Successfully.",
        data : result
    })
})


export const UserController = {
    uploadProfileImage
}