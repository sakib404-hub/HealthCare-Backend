import nodemailer from "nodemailer";
import config from "../config";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: config.smtp.user,
		pass: config.smtp.password,
	},
});

export default transporter;
