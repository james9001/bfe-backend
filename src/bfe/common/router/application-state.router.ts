import express, { Request, Response } from "express";
import { applicationStateRepository } from "../repository/application-state.repository";
import { childProcessEventEmitter } from "../service/child-process.service";
require("express-async-errors");

export const applicationStateRouter = express.Router();

applicationStateRouter.get("/state", async (req: Request, resp: Response) => {
	const state = await applicationStateRepository.get();

	resp.status(200).send(state);
});

applicationStateRouter.post("/killcurrentprocess", async (req: Request, resp: Response) => {
	void handleEmitKillCurrentProcess();
	resp.status(200).send("KillCurrentProcess event will be emitted");
});

const handleEmitKillCurrentProcess = async (): Promise<void> => {
	childProcessEventEmitter.emit("KillCurrentProcess");
	console.log("KillCurrentProcess event emitted");
};
