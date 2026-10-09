import { isBefore, isSameDay } from "date-fns";
import httpStatus from "http-status";
import {
	AppointmentStatus,
	PaymentStatus,
	ScheduleStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	BookAppointments,
	CancelAppointment,
	PayAppointment,
} from "./appointment.interface";

const bookAppointments = async (payLoad: BookAppointments, user: RequestUser) => {
	const transactionResult = await prisma.$transaction(async (tx) => {
		//? checking if the patient exists 
		const isPatientExists = await prisma.patient.findUnique({
			where : {
				userId : user.userId
			}
		})
		if(!isPatientExists){
			throw new AppError(httpStatus.NOT_FOUND, "Patient Does not exists");
		}

		//? checking for the scheule
		const schedule = await prisma.schedule.findUnique({
			where : {
				id : payLoad.scheduleId
			},
			include :{
				doctor : true
			}
		})

		if(!schedule || schedule.isDeleted){
			throw new AppError(httpStatus.NOT_FOUND, "Schedule Not Found.");
		}

		if(schedule.status !== ScheduleStatus.PUBLISHED){
			throw new AppError(httpStatus.BAD_REQUEST, "Schedule is Not Published Yet.");
		}

		const now = new Date();
		if(!isSameDay(now, new Date(schedule.startDateTime))){
			throw new AppError(httpStatus.BAD_REQUEST, "This Schedule is Not Available Today.");
		}

		if(!isBefore(now, new Date(schedule.startDateTime))){
			throw new AppError(httpStatus.BAD_REQUEST, "This Schedule is Already Started.")
		}


		const existingAppointment = await prisma.appointment.findFirst({
			where : {
				scheduleId : payLoad.scheduleId,
				patientId : isPatientExists.id,
				// status : {
				// 	not : AppointmentStatus.CANCELLED
				// }
			}
		})


		if(existingAppointment?.status === AppointmentStatus.PENDING){
			throw new AppError(httpStatus.BAD_GATEWAY, "You Already had a pending appointment , Pay or cancel that first");
		}
		if(existingAppointment?.status === AppointmentStatus.CONFIRMED){
			throw new AppError(httpStatus.BAD_REQUEST, "You Already Have a Confirmed appointment.");
		}

		if(existingAppointment?.status === AppointmentStatus.ONGOING){
			throw new AppError(httpStatus.BAD_REQUEST, "You Already Have a appointment Ongoing.");
		}
		if(existingAppointment?.status === AppointmentStatus.COMPLETED){
			throw new AppError(httpStatus.BAD_REQUEST, "You Already Have Completed An appointment on this schedule, Please try again another day.");
		}

		//? checking for the slot if it is empty or not
		if(schedule.availableSlot === 0){
			throw new AppError(httpStatus.BAD_REQUEST, "This Schedule is Fully Booked.");
		}

		if(!schedule.doctor.consultationFee){
			throw new AppError(httpStatus.BAD_REQUEST, "Doctor has not set a consultation Fee");
		}

		const amount = Number(schedule.doctor.consultationFee);


		//? creating the appointment
		const appointment = await tx.appointment.create({
			data: {
				status: AppointmentStatus.PENDING,
				patientId : isPatientExists.id,
				doctorId : schedule.doctor.id,
				scheduleId : schedule.id,

			},
		});

		//?  external service provided from bkash
		const bkashIdToken = await getBkashIdToken();
		if (!bkashIdToken) {
			throw new Error("No Bkash Access token found.");
		}

		const bkashCreatePaymentResponse = await fetch(
			`${config.bkash.base_url}/tokenized/checkout/create`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: bkashIdToken,
					"X-App-Key": config.bkash.api_key,
				},
				body: JSON.stringify({
					mode: "0011",
					payerReference: user?.email, //? user email or phone number
					callbackURL: `${config.bkash.bkash_callback_url}/appointment/book-appointment/payment/callback`, //? call back url of the bkash
					amount: amount.toString(),
					currency: "BDT",
					intent: "sale",
					//? agreementID: "1234567881", //? accroding to us appointmentid
					merchantInvoiceNumber: appointment.id, //? appointmentId
				}),
			},
		);

		const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

		//? creating the payment model

		await tx.payment.create({
			data: {
				marchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
				appointmentId: appointment.id,
				amount: amount,
				refundAmount: 200,
				gateWayResponse: bkashCreatePaymentResult,
				bkashPayemtnId: bkashCreatePaymentResult.paymentID,
				payerReference: user?.email,
			},
		});
		return bkashCreatePaymentResult.bkashURL;
	});

	return {
		paymentUrl: transactionResult,
	};
};

const bookAppointmentCallBack = async (query: Record<string, any>) => {
	const transactionResult = await prisma.$transaction(async (tx) => {
		//? getting the query from the callback url that bkash call itself
		const paymentId = query.paymentID;
		const status = query.status;
		if (!paymentId) {
			throw new Error("Payment Id is Missing.");
		}
		if (!status) {
			throw new Error("Payment Status is Missing.");
		}

		//? getting the bkash id token from the bkash client or the grant token
		const bkashIdToken = await getBkashIdToken();
		if (!bkashIdToken) {
			throw new Error("Bkash Id Token Not Found!.");
		}

		//? executing the payment
		const executedPayment = await fetch(
			`${config.bkash.base_url}/tokenized/checkout/execute`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: bkashIdToken,
					"X-App-Key": config.bkash.api_key,
				},
				body: JSON.stringify({
					paymentID: paymentId,
				}),
			},
		);

		const executedPayementResponse = await executedPayment.json();

		//? console.log(executedPayementResponse);

		if (status === "success") {
			//? when the payment says it is successfull
			await tx.appointment.update({
				where: {
					id: executedPayementResponse.merchantInvoiceNumber,
				},
				data: {
					status: AppointmentStatus.CONFIRMED,
				},
			});

			await tx.payment.update({
				where: {
					//? appointmentId : executedPayementResponse.merchantInvoiceNumber
					bkashPayemtnId: paymentId,
				},
				data: {
					status: PaymentStatus.PAID,
					bkashTransactionId: executedPayementResponse.trxID,
					paidAt: executedPayementResponse.paymentExecuteTime,
					gateWayResponse: executedPayementResponse,
				},
			});

			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=success`,
			};
		} else if (status === "failure") {
			await tx.payment.update({
				where: {
					//? appointmentId : executedPayementResponse.merchantInvoiceNumber
					bkashPayemtnId: paymentId,
				},
				data: {
					status: PaymentStatus.FAILED,
					gateWayResponse: executedPayementResponse,
				},
			});
			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=failure`,
			};
		} else if (status === "cancel") {
			await tx.payment.update({
				where: {
					//? appointmentId : executedPayementResponse.merchantInvoiceNumber
					bkashPayemtnId: paymentId,
				},
				data: {
					status: PaymentStatus.CANCELLED,
					gateWayResponse: executedPayementResponse,
				},
			});
			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=cancel`,
			};
		} else {
			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-appointments`,
			};
		}
	});

	return transactionResult;
};

//? existing appointment payment
const payAppointment = async (payLoad: PayAppointment, user: RequestUser) => {
	const appointmentId = payLoad.appointmentId;

	const isAppointmentExist = await prisma.appointment.findUnique({
		where: {
			id: appointmentId,
			
		},
		include : {
			schedule : {
				include : {
					doctor : true
				}
			}
		}
	});

	if (!isAppointmentExist) {
		throw new Error("Appointment Does not Exist.");
	}

	//? we can do this
	// if(!isAppointmentExist){
	//   throw new Error("Appointment Does not Exist.");
	// }else if(isAppointmentExist.status === AppointmentStatus.CONFIRMED){
	//   throw new Error("Appointment is Already Paid and Confirmed");
	// }else if(isAppointmentExist.status === AppointmentStatus.CANCELLED || isAppointmentExist.status === AppointmentStatus.ONGOING || isAppointmentExist.status === AppointmentStatus.COMPLETED ){
	//   const status = isAppointmentExist.status.toLocaleLowerCase();
	//   throw new Error(`Appointment is Already ${status}`);
	// }

	//? or we can do this also

	if (isAppointmentExist.status !== AppointmentStatus.PENDING) {
		throw new Error("Appointment status is not pending.");
	}

	
	if(!isAppointmentExist.schedule.doctor.consultationFee){
		throw new AppError(httpStatus.BAD_REQUEST, "Doctor has not set a consultation Fee");
	}

	//? checking for the bkash id grant token
	const bkashIdToken = await getBkashIdToken();
	if (!bkashIdToken) {
		throw new Error("Bkash Id Token Does not Exist.");
	}

	//? therefore initiating the payment
	const bkashPaymentInitiate = await fetch(
		`${config.bkash.base_url}/tokenized/checkout/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: bkashIdToken,
				"X-App-Key": config.bkash.api_key,
			},
			body: JSON.stringify({
				mode: "0011",
				payerReference: user?.email, //? user email or phone number
				callbackURL: `${config.bkash.bkash_callback_url}/appointment/book-appointment/payment/callback`, //? call back url of the bkash
				amount: isAppointmentExist.schedule.doctor.consultationFee?.toString(),
				currency: "BDT",
				intent: "sale",
				//? agreementID: "1234567881", //? accroding to us appointmentid
				merchantInvoiceNumber: isAppointmentExist.id, //? appointmentId
			}),
		},
	);

	const bkashPaymentInitiateResult = await bkashPaymentInitiate.json();

	await prisma.payment.update({
		where: {
			appointmentId: isAppointmentExist.id,
		},
		data: {
			marchantInvoiceNumber: bkashPaymentInitiateResult.merchantInvoiceNumber,
			gateWayResponse: bkashPaymentInitiateResult,
			bkashPayemtnId: bkashPaymentInitiateResult.paymentID,
		},
	});

	return {
		paymentUrl: bkashPaymentInitiateResult.bkashURL,
	};
};

const cancelAppointment = async (payLoad: CancelAppointment) => {
	const transactionResult = await prisma.$transaction(async (tx) => {
		//? taking the appointment id and checking if it exists
		const appointmentId = payLoad.appointmentId;
		const isAppointmentExist = await tx.appointment.findUnique({
			where: {
				id: appointmentId,
			},
			include: {
				payment: true,
			},
		});

		if (!isAppointmentExist) {
			throw new Error("Appointment with the appointment id does not exists.");
		}

		//? checking if the status is on that we can cancel
		if (
			isAppointmentExist.status === AppointmentStatus.ONGOING ||
			isAppointmentExist.status === AppointmentStatus.COMPLETED
		) {
			throw new Error("Appointment is Ongoing or Completed.");
		} else if (isAppointmentExist.status === AppointmentStatus.CANCELLED) {
			throw new Error("Appointment Already Cancelled");
		}

		//? updating the appointment as cancelled
		const updatedAppointment = await tx.appointment.update({
			where: {
				id: isAppointmentExist.id,
			},
			data: {
				status: AppointmentStatus.CANCELLED,
			},
		});

		//? now making the refund policy
		const bkashIdToken = await getBkashIdToken();
		if (!bkashIdToken) {
			throw new Error("No Bkash Access Token Found.");
		}

		const bkashRefundPaymentResponse = await fetch(
			`${config.bkash.base_url}/tokenized/checkout/payment/refund`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: bkashIdToken,
					"X-App-Key": config.bkash.api_key,
				},
				body: JSON.stringify({
					paymentID: isAppointmentExist.payment?.bkashPayemtnId,
					amount: isAppointmentExist.payment?.refundAmount,
					trxID: isAppointmentExist.payment?.bkashTransactionId,
					reason: "Patient cancelled the appointment", //? reason for cancelling the appointment
					sku: "Appointment Cancellation.",
				}),
			},
		);

		const bkashRefundPayementResult = await bkashRefundPaymentResponse.json();
		// console.log(bkashRefundPayementResult);

		//? updating the payment from our end
		const updatedPayment = await tx.payment.update({
			where: {
				appointmentId: isAppointmentExist.id,
			},
			data: {
				refundTrxId: bkashRefundPayementResult.refundTrxID,
				refundedAt: bkashRefundPayementResult.completedTime,
				refundAmount: bkashRefundPayementResult.amount,
				refundReason: "Patient cancelled the appointment",
				status: PaymentStatus.REFUNDED,
				gateWayResponse: bkashRefundPayementResult,
			},
		});

		return {
			appointment: updatedAppointment,
			payment: updatedPayment,
		};
	});

	return transactionResult;
};

export const AppointmentServices = {
	bookAppointments,
	bookAppointmentCallBack,
	payAppointment,
	cancelAppointment,
};
