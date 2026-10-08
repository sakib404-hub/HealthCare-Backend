import { addDays, differenceInMinutes, startOfDay } from "date-fns"
import status from "http-status"
import { prisma } from "../../lib/prisma"
import type{ RequestUser } from "../../middleware/checkAuth"
import { AppError } from "../../utils/AppError"
import type{ ICreateSchedulePayLoad } from "./schedule.interface"

const createSchedule = async(payLoad : ICreateSchedulePayLoad, user : RequestUser)=>{
    const doctor = await prisma.doctor.findUnique({
        where : {
            userId : user.userId
        }
    })

    if(!doctor){
        throw new AppError(status.NOT_FOUND, "Doctor Not Found.");
    }

    const startOfTheDay = startOfDay(payLoad.startDateTime); //? 25 August 12.00AM
    const startOfNextDay = addDays(startOfTheDay, 1); //? 26 August 12.00AM


    const existingShcedule = await prisma.schedule.findFirst({
        where : {
            doctorId : doctor.id,
            isDeleted : false,
            startDateTime : {
                gte : startOfTheDay,
                lt : startOfNextDay
            }
        }
    })

    if(existingShcedule){
        throw new AppError(status.CONFLICT, " You Already Have a schedule for this Date.")
    }


    //? finding the total duration in minutes and total slots
    const durationInMinutes = differenceInMinutes(payLoad.startDateTime, payLoad.endDateTime);
    
    const MINUTES_ALLOCATED_PER_SLOT = 20;
    const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

    const schedule = await prisma.schedule.create({
        data : {
            startDateTime : payLoad.startDateTime,
            endDateTime : payLoad.endDateTime,
            meetLink : payLoad.meetLink,
            totalSlot : totalSlots,
            availableSlot : totalSlots,
            doctorId : doctor.id
        },
        include : {
            doctor : {
                select : {
                    name : true,
                    email : true,
                    contactNumber : true
                }
            }
        }
    })

    return schedule;
}


export const ScheduleServices = {
    createSchedule
}