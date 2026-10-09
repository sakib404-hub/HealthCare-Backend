export interface ICreateSchedulePayLoad {
	startDateTime: Date;
	endDateTime: Date;
	meetLink: string;
}

export interface IUpdateSchedule {
	startDateTime ?: Date;
	endDateTime ?: Date;
	meetLink ?: string;
}

export interface IGetMyScheduleQuery {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortOrder?: string;
	sortBy?: string;

	//? any other filter or query perameter is added here
	[key: string]: any;
}
