import { AppointmentStatus, PaymentStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";

const bookAppointments = async (payLoad: any, user: RequestUser) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    //? creating the appointment
    const appointment = await tx.appointment.create({
      data: {
        status: AppointmentStatus.PENDING,
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
      data: {
        marchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
        appointmentId: appointment.id,
        amount: 200,
        refundAmount: 200,
        gateWayResponse: bkashCreatePaymentResult,
        bkashPayemtnId: bkashCreatePaymentResult.paymentID,
        payerReference: user?.email,
      },
    });
    return bkashCreatePaymentResult.bkashURL;
  });

  return transactionResult;
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
      }
    );

    const executedPayementResponse = await executedPayment.json();

   //? console.log(executedPayementResponse);

    if (status === "success") {
      //? when the payment says it is successfull
      await tx.appointment.update({
        where : {
          id : executedPayementResponse.merchantInvoiceNumber
        },
        data : {
          status : AppointmentStatus.CONFIRMED
        }
      })

      await tx.payment.update({
        where : {
          //? appointmentId : executedPayementResponse.merchantInvoiceNumber
          bkashPayemtnId : paymentId
        },
        data : {
          status : PaymentStatus.PAID ,
          bkashTransactionId : executedPayementResponse.trxId,
          paidAt : executedPayementResponse.paymentExecuteTime,
          gateWayResponse : executedPayementResponse
        }
      })


      return {
        redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=success`,
      };
    }else if (status === "failure") {

      await tx.payment.update({
        where : {
          //? appointmentId : executedPayementResponse.merchantInvoiceNumber
          bkashPayemtnId : paymentId
        },
        data : {
          status : PaymentStatus.FAILED ,
          gateWayResponse : executedPayementResponse
        }
      })
      return {
        redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=failure`,
      };
    }else if (status === "cancel") {
      await tx.payment.update({
        where : {
          //? appointmentId : executedPayementResponse.merchantInvoiceNumber
          bkashPayemtnId : paymentId
        },
        data : {
          status : PaymentStatus.CANCELLED ,
          gateWayResponse : executedPayementResponse
        }
      })
      return {
        redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=cancel`,
      };
    }else {
      return {
      redirectUrl: `${config.frontend_url}/dashboard/my-appointments`,
    };
    }
  });

  return transactionResult;
};
export const AppointmentServices = {
  bookAppointments,
  bookAppointmentCallBack,
};
