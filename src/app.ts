import cookieParser from "cookie-parser";
import cors from "cors";
import type { Application, NextFunction, Request, Response } from "express";
import express from "express";
import httpStatus from "http-status";
import config from "./app/config";
import crypto from "crypto";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import redisClient from "./app/lib/redis";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);

app.get("/test", async (req: Request, res: Response, next: NextFunction) => {
	try {
		// const otp = crypto.randomInt(100000, 1000000);
		// console.log(otp);

		// redisClient.set("forgot-password-otp:patient1@gmail.com", "123456", {
		// 	expiration : {
		// 		type : "EX",
		// 		value : 60 //? the otp will be valid for only 60s
		// 	}
		// })

		res.status(httpStatus.OK).json({
			success: true,
			message: "This is the zod validation route",
			data: null,
		});
	} catch (err) {
		console.log("Error executing the test code : ", err);
	}
});

const formatUptime = (seconds: number): string => {
	const days = Math.floor(seconds / (3600 * 24));
	const hours = Math.floor((seconds % (3600 * 24)) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	parts.push(`${secs}s`);

	return parts.join(" ");
};

// Basic route
app.get("/", async (req: Request, res: Response) => {
	const uptimeSeconds = Math.floor(process.uptime());

	res.status(httpStatus.OK).json({
		success: true,
		message:
			"Welcome to PH Healthcare System Backend - Server is running and under development",
		version: process.env.npm_package_version || "1.0.0",
		author: "sakib404-hub",
		developer: "sakib404-hub",
		uptime: formatUptime(uptimeSeconds),
		uptimeSeconds,
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
