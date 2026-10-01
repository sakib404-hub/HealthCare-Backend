import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";

const bookAppointments = async () => {
  //?  other business login

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
        payerReference: "hellow", //? user email or phone number
        callbackURL: `${config.bkash.bkash_callback_url}/appointment/book-appointment/payment/callback`, //? call back url of the bkash
        amount: "1200.00",
        currency: "BDT",
        intent: "sale",
        //? agreementID: "1234567881", //? accroding to us appointmentid
        merchantInvoiceNumber: "INV-20261001-99812-1", //? appointmentId
      }),
    }
  );


  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

  return bkashCreatePaymentResult;
};

const bookAppointmentCallBack = async(query :  Record<string, any>)=>{

    const paymentId = query.paymentID;
    const status = query.status;

    if(!paymentId){
      throw new Error("Payment Id is Missing.");
    }

    if(!status){
      throw new Error("Payment Status is Missing.");
    }

    const bkashIdToken = await getBkashIdToken();

    if(!bkashIdToken){
      throw new Error("Bkash Id Token Not Found!.")
    }

    const executedPayment = await fetch(`${config.bkash.base_url}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: bkashIdToken,
        "X-App-Key": config.bkash.api_key,
      },
      body : JSON.stringify({
        paymentID : paymentId
      })
    })

    const executedPayementResponse = await executedPayment.json();


    if(status === "success"){
      return {
        executedPayementResponse,
        redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=success`
      }
    }

    if(status === 'failure'){
      return {
        executedPayementResponse,
        redirectUrl  : `${config.frontend_url}/dashboard/my-appointments?status=failure`
      }
    }

      if(status === 'cancel'){
      return {
        executedPayementResponse,
        redirectUrl  : `${config.frontend_url}/dashboard/my-appointments?status=cancel`
      }
    }

    return {
      executedPayementResponse,
      redirectUrl  : `${config.frontend_url}/dashboard/my-appointments`
    }
}
export const AppointmentServices = {
  bookAppointments,
  bookAppointmentCallBack
};
