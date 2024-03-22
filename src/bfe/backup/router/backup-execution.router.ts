import express, { Request, Response } from "express";
import {
	BackupExecution,
	backupExecutionRepository,
} from "../repository/backup-execution.repository";
require("express-async-errors");

export const backupRouter = express.Router();

backupRouter.post("/execution", async (req: Request, resp: Response) => {
	const newItem = new BackupExecution();
	newItem.preservationTargetId = parseInt(req.body.preservationTargetId);
	newItem.artefactName = req.body.artefactName;
	newItem.category = req.body.category;
	newItem.checksum = { checksumValue: req.body.checksum.checksumValue };
	const item = await backupExecutionRepository.create(newItem);

	resp.status(200).send(item);
});

backupRouter.get("/execution", async (req: Request, resp: Response) => {
	const items = await backupExecutionRepository.getAll();

	resp.status(200).send(items);
});

backupRouter.get("/execution/:id", async (req: Request, resp: Response) => {
	const item = await backupExecutionRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

backupRouter.put("/execution", async (req: Request, resp: Response) => {
	const updateItem = await backupExecutionRepository.getById(parseInt(req.body.id));
	updateItem.preservationTargetId = parseInt(req.body.preservationTargetId);
	updateItem.artefactName = req.body.artefactName;
	updateItem.category = req.body.category;
	updateItem.checksum = { checksumValue: req.body.checksum.checksumValue };
	await backupExecutionRepository.update(updateItem);

	resp.status(200).send();
});

backupRouter.delete("/execution/:id", async (req: Request, resp: Response) => {
	await backupExecutionRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
