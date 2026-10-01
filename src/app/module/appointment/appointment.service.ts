import { success } from "zod";
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
        payerReference: "01712345678", //? user email or phone number
        callbackURL: `${config.bkash.bkash_callback_url}/appointment/book-appointment/payment/callback`, //? call back url of the bkash
        amount: "1200.00",
        currency: "BDT",
        intent: "sale",
        agreementID: "1234567881", //? accroding to us appointmentid
        merchantInvoiceNumber: "INV-20261001-99812", //? appointmentId
      }),
    }
  );


  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

  return bkashCreatePaymentResult;
};

const bookAppointmentCallBack = async()=>{
    return {
        success : true
    }
}
export const AppointmentServices = {
  bookAppointments,
  bookAppointmentCallBack
};
