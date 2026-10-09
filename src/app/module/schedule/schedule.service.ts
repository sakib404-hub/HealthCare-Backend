import { addDays, differenceInMinutes, startOfDay } from "date-fns";
import status from "http-status";
import { ScheduleStatus } from "../../../generated/prisma/enums";
import type { ScheduleWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type { IQuery } from "../doctor/doctor.interface";
import type {
	ICreateSchedulePayLoad,
	IGetMyScheduleQuery,
  IUpdateSchedule,
} from "./schedule.interface";



const createSchedule = async (
	payLoad: ICreateSchedulePayLoad,
	user: RequestUser,
) => {
	const doctor = await prisma.doctor.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!doctor) {
		throw new AppError(status.NOT_FOUND, "Doctor Not Found.");
	}

	const startOfTheDay = startOfDay(payLoad.startDateTime); //? 25 August 12.00AM
	const startOfNextDay = addDays(startOfTheDay, 1); //? 26 August 12.00AM

	const existingShcedule = await prisma.schedule.findFirst({
		where: {
			doctorId: doctor.id,
			isDeleted: false,
			startDateTime: {
				gte: startOfTheDay,
				lt: startOfNextDay,
			},
		},
	});

	if (existingShcedule) {
		throw new AppError(
			status.CONFLICT,
			" You Already Have a schedule for this Date.",
		);
	}

	//? finding the total duration in minutes and total slots
	const durationInMinutes = differenceInMinutes(
		payLoad.startDateTime,
		payLoad.endDateTime,
	);

	const MINUTES_ALLOCATED_PER_SLOT = 20;
	const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

	const schedule = await prisma.schedule.create({
		data: {
			startDateTime: payLoad.startDateTime,
			endDateTime: payLoad.endDateTime,
			meetLink: payLoad.meetLink,
			totalSlot: totalSlots,
			availableSlot: totalSlots,
			doctorId: doctor.id,
		},
		include: {
			doctor: {
				select: {
					name: true,
					email: true,
					contactNumber: true,
				},
			},
		},
	});

	return schedule;
};

const getMySchedules = async (
	query: IGetMyScheduleQuery,
	user: RequestUser,
) => {
	const doctor = await prisma.doctor.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!doctor) {
		throw new AppError(
			status.NOT_FOUND,
			"Doctor with the doctor Id not is not found.",
		);
	}

	let limit = 10;
	if (query?.limit) {
		limit = Number(query?.limit);
	}

	let page = 1;
	if (query?.page) {
		page = Number(query?.page);
	}

	const skip = (page - 1) * limit;

	const andConditions: ScheduleWhereInput[] = [
		{
			doctorId: doctor.id,
		},
		{
			isDeleted: false,
		},
	];

	//? adding the other condition

	if (query.status) {
		andConditions.push({
			status: query.status,
		});
	}

	//? getting the schedules

	const schedules = await prisma.schedule.findMany({
		where: {
			AND: andConditions,
		},
		take: limit,
		skip,
		orderBy: {
			startDateTime: "desc",
		},
		include: {
			appointment: {
				include: {
					patient: true,
					doctor: true,
				},
			},
		},
	});

	const total = await prisma.schedule.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: schedules,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getAllSchedule = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;

	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: ScheduleWhereInput[] = [];

	if (query.doctorId) {
		andConditions.push({ doctorId: query.doctorId });
	}

	if (query.email) {
		andConditions.push({
			doctor: {
				email: query.email,
			},
		});
	}

	if (query.status) {
		andConditions.push({ status: query.status });
	}

	//? searchTerm
	if (query.searchTerm) {
		andConditions.push({
			doctor: {
				OR: [
					{ name: { contains: query.searchTerm, mode: "insensitive" } },
					{ email: { contains: query.searchTerm, mode: "insensitive" } },
					{
						specialization: {
							contains: query.searchTerm,
							mode: "insensitive",
						},
					},
				],
			},
		});
	}

	const schedules = await prisma.schedule.findMany({
		where: {
			AND: andConditions,
		},
		take: limit,
		skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			appointment: {
				include: {
					patient: true,
					doctor: true,
				},
			},
		},
	});

	const total = await prisma.schedule.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: schedules,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getScheduleById = async (scheduleId: string, user: RequestUser) => {
	const schedule = await prisma.schedule.findUnique({
		where: {
			id: scheduleId,
		},
		include: {
			doctor: {
				select: {
					id: true,
					name: true,
					email: true,
					specialization: true,
					userId: true,
				},
			},
			appointment: {
				include: {
					patient: true,
				},
			},
		},
	});

	if (!schedule || schedule.isDeleted) {
		throw new AppError(status.NOT_FOUND, "Schedule Not Found.");
	}

	return schedule;
};


const updateSchedule = async(scheduleId : string, payLoad : IUpdateSchedule, user : RequestUser)=>{

    //? checking if the user that is requesting exist as doctor
    const doctor = await prisma.doctor.findUnique({
      where : {
        userId : user.userId
      }
    })

    if(!doctor){
      throw new AppError(status.NOT_FOUND, "Doctor not Found.")
    }

    //? finding the schedule with the schedule id and the doctor Id
    const schedule = await prisma.schedule.findUnique({
      where : {
        id : scheduleId,
        doctorId : doctor.id
      }
    })

    if(!schedule || schedule.isDeleted){
      throw new AppError(status.NOT_FOUND,  "Schedule not Found.");
    }

    if(schedule.status === ScheduleStatus.PUBLISHED && schedule.totalSlot !== schedule.availableSlot){
      throw new AppError(status.CONFLICT, "Schedule is published and appointment is booked, Therefore it can not be updated.");
    }

    payLoad.meetLink = payLoad.meetLink ||  schedule.meetLink;
    payLoad.endDateTime = payLoad.endDateTime || schedule.endDateTime;
    payLoad.startDateTime = payLoad.startDateTime || schedule.startDateTime;


    //? checking if the new schedule is not have any conflit with this one
    const startOfTheDay = startOfDay(payLoad.startDateTime);
    const startOfNextDay = addDays(startOfTheDay, 1);

    const existingShceduleOnThisDate =  await prisma.schedule.findFirst({
      where : {
        id : {
          not : scheduleId
        },
        doctorId : doctor.id,
        isDeleted : false,
        startDateTime : {
          gte : startOfTheDay,
          lt : startOfNextDay
        }
      }
    })

    if(existingShceduleOnThisDate){
      throw new AppError(status.CONFLICT, "You Already Have a Schedule on this Date.")
    }


    const durationInMinutes = differenceInMinutes(new Date(startOfTheDay), new Date(startOfNextDay));

    const MINUTES_ALLOCATED_PER_SLOT = 20;
    const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

    //? updating the schedule
    const updateSchedule = await prisma.schedule.update({
      where : {
        id : scheduleId
      },
      data : {
        meetLink : payLoad.meetLink,
        startDateTime : payLoad.startDateTime,
        endDateTime : payLoad.endDateTime,
        totalSlot : totalSlots,
        availableSlot : totalSlots,
      },
      include : {
        doctor : {
          select : {
            name : true,
            email : true,
            specialization : true
          }
        }
      }
    })

    return updateSchedule;
  
}


const publishSchedule = async(scheduleId : string, user : RequestUser)=>{
  const doctor = await prisma.doctor.findUnique({
    where : {
      userId : user.userId
    }
  })

  if(!doctor){
    throw new AppError(status.NOT_FOUND, "Doctor Not Found.");
  }

  const schedule = await prisma.schedule.findUnique({
    where : {
      id : scheduleId,
      doctorId : doctor.id
    }
  })

  if(!schedule){
     throw new AppError(status.NOT_FOUND,  "Schedule not Found.");
  }

  if(schedule.status === ScheduleStatus.PUBLISHED){
    throw new AppError(status.CONFLICT, "Schedule is Already Published");
  }

  const publishedSchedule = await prisma.schedule.update({
    where : {
      id : scheduleId,
      doctorId : user.userId
    },
    data : {
      status : ScheduleStatus.PUBLISHED
    }
  })

  return publishedSchedule;
}

const deleteSchedule = async(scheduleId : string, user : RequestUser)=>{

  const doctor = await prisma.doctor.findUnique({
    where : {
      userId : user.userId
    }
  })

  if(!doctor){
    throw new AppError(status.NOT_FOUND, "Doctor Not Found.");
  }

  const schedule = await prisma.schedule.findUnique({
    where : {
      id : scheduleId,
      doctorId : doctor.id
    }
  })

  if(!schedule){
     throw new AppError(status.NOT_FOUND,  "Schedule not Found.");
  }

  if(schedule.status === ScheduleStatus.PUBLISHED || schedule.availableSlot !== schedule.totalSlot){
    throw new AppError(status.CONFLICT, "Schedule is Already Published and there is booking therefore you can not delete it.");
  }

  const deleteSchedule =  await prisma.schedule.update({
    where : {
      id : scheduleId,
      doctorId : user.userId
    },
    data : {
      isDeleted : true,
      deletedAt : new Date()
    }
  })

  return deleteSchedule;
}

export const ScheduleServices = {
	createSchedule,
	getMySchedules,
	getAllSchedule,
	getScheduleById,
  updateSchedule,
  publishSchedule,
  deleteSchedule
};
