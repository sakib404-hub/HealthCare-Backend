import { AppointmentStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import type{ RequestUser } from "../../middleware/checkAuth";

const bookAppointments = async (payLoad : any, user : RequestUser) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    //? creating the appointment
    const appointment = await tx.appointment.create({
      data : {
        status : AppointmentStatus.PENDING
      }
    })


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
          amount: "200.00",
          currency: "BDT",
          intent: "sale",
          //? agreementID: "1234567881", //? accroding to us appointmentid
          merchantInvoiceNumber: appointment.id, //? appointmentId
        }),
      }
    );

    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

    //? creating the payment model

    await tx.payment.create({
      data : {
         marchantInvoiceNumber : bkashCreatePaymentResult.merchantInvoiceNumber,
         appointmentId : appointment.id,
         amount : 200,
         refundAmount : 200,
         gateWayResponse : bkashCreatePaymentResult,
         bkashPayemtnId : bkashCreatePaymentResult.paymentID,
         payerReference : user?.email
      }
    })

    return bkashCreatePaymentResult.bKashURL;
  });

  return transactionResult;
};

const bookAppointmentCallBack = async (query: Record<string, any>) => {
  const paymentId = query.paymentID;
  const status = query.status;

  if (!paymentId) {
    throw new Error("Payment Id is Missing.");
  }

  if (!status) {
    throw new Error("Payment Status is Missing.");
  }

  const bkashIdToken = await getBkashIdToken();

  if (!bkashIdToken) {
    throw new Error("Bkash Id Token Not Found!.");
  }

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
    }
  );

  const executedPayementResponse = await executedPayment.json();

  if (status === "success") {
    return {
      executedPayementResponse,
      redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=success`,
    };
  }

  if (status === "failure") {
    return {
      executedPayementResponse,
      redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=failure`,
    };
  }

  if (status === "cancel") {
    return {
      executedPayementResponse,
      redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=cancel`,
    };
  }

  return {
    executedPayementResponse,
    redirectUrl: `${config.frontend_url}/dashboard/my-appointments`,
  };
};
export const AppointmentServices = {
  bookAppointments,
  bookAppointmentCallBack,
};
