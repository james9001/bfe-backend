import express, { Request, Response } from "express";
import {
	UploadExecution,
	uploadExecutionRepository,
	UploadStatus,
} from "../repository/upload-execution.repository";
require("express-async-errors");

export const uploadExecutionRouter = express.Router();

uploadExecutionRouter.post("/execution", async (req: Request, resp: Response) => {
	const newItem = new UploadExecution();
	newItem.backupExecutionId = parseInt(req.body.backupExecutionId);
	newItem.status = Object.entries(UploadStatus).find(([_key, val]) => {
		return val === req.body.status;
	})?.[1] as UploadStatus;
	newItem.destination = req.body.destination;
	newItem.destinationPath = req.body.destinationPath;
	const item = await uploadExecutionRepository.create(newItem);

	resp.status(200).send(item);
});

uploadExecutionRouter.get("/execution", async (req: Request, resp: Response) => {
	const items = await uploadExecutionRepository.getAll();

	resp.status(200).send(items);
});

uploadExecutionRouter.get("/execution/:id", async (req: Request, resp: Response) => {
	const item = await uploadExecutionRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

uploadExecutionRouter.put("/execution", async (req: Request, resp: Response) => {
	const updateItem = await uploadExecutionRepository.getById(parseInt(req.body.id));
	updateItem.backupExecutionId = parseInt(req.body.backupExecutionId);
	updateItem.status = Object.entries(UploadStatus).find(([_key, val]) => {
		return val === req.body.status;
	})?.[1] as UploadStatus;
	updateItem.destination = req.body.destination;
	updateItem.destinationPath = req.body.destinationPath;
	await uploadExecutionRepository.update(updateItem);

	resp.status(200).send();
});

uploadExecutionRouter.delete("/execution/:id", async (req: Request, resp: Response) => {
	await uploadExecutionRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
