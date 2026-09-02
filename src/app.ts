import cookieParser from "cookie-parser";
import cors from "cors";
import type { Application, NextFunction, Request, Response } from "express";
import express from "express";
import httpStatus from "http-status";
import z, { email } from "zod";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";

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


app.post("/zod", async(req : Request, res : Response, next : NextFunction)=>{
	try{

	const UserZodSchema = z.object({
		name : z.string(),
		age : z.number().optional(),
		isVarified : z.boolean(),
		books : z.array(z.string())
	})

	const payLoad = req.body;

	const result = UserZodSchema.parse(payLoad)

	res.status(httpStatus.OK).json({
		success : true,
		message : "This is the zod validation route",
		data : result
	})

	}catch(err){
		console.log(err);
		next();
	}
})

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
