import express, { Request, Response } from "express";
import {
	QueuedBackupExecution,
	queuedBackupExecutionRepository,
} from "../repository/queued-backup-execution.repository";
require("express-async-errors");

export const queuedBackupExecutionRouter = express.Router();

queuedBackupExecutionRouter.post(
	"/queued-backup-execution",
	async (req: Request, resp: Response) => {
		const newItem = new QueuedBackupExecution();

		newItem.preservationTargetId = parseInt(req.body.preservationTargetId);
		newItem.orderNumber = parseInt(req.body.orderNumber);
		newItem.intendedBackupCategory = req.body.intendedBackupCategory;
		newItem.intendedUploadDestination = req.body.intendedUploadDestination;
		newItem.intendedUploadPath = req.body.intendedUploadPath;
		newItem.secondIntendedUploadDestination = req.body.secondIntendedUploadDestination;
		newItem.secondIntendedUploadPath = req.body.secondIntendedUploadPath;
		newItem.actualBackupExecutionId = parseInt(req.body.actualBackupExecutionId);

		const item = await queuedBackupExecutionRepository.create(newItem);

		resp.status(200).send(item);
	}
);

queuedBackupExecutionRouter.get(
	"/queued-backup-execution",
	async (req: Request, resp: Response) => {
		const items = await queuedBackupExecutionRepository.getAll();

		resp.status(200).send(items);
	}
);

queuedBackupExecutionRouter.get(
	"/queued-backup-execution/:id",
	async (req: Request, resp: Response) => {
		const item = await queuedBackupExecutionRepository.getById(parseInt(req.params.id));

		resp.status(200).send(item);
	}
);

queuedBackupExecutionRouter.put(
	"/queued-backup-execution",
	async (req: Request, resp: Response) => {
		const updateItem = await queuedBackupExecutionRepository.getById(parseInt(req.body.id));

		updateItem.preservationTargetId = parseInt(req.body.preservationTargetId);
		updateItem.orderNumber = parseInt(req.body.orderNumber);
		updateItem.intendedBackupCategory = req.body.intendedBackupCategory;
		updateItem.intendedUploadDestination = req.body.intendedUploadDestination;
		updateItem.intendedUploadPath = req.body.intendedUploadPath;
		updateItem.secondIntendedUploadDestination = req.body.secondIntendedUploadDestination;
		updateItem.secondIntendedUploadPath = req.body.secondIntendedUploadPath;
		updateItem.actualBackupExecutionId = parseInt(req.body.actualBackupExecutionId);

		await queuedBackupExecutionRepository.update(updateItem);

		resp.status(200).send();
	}
);

queuedBackupExecutionRouter.delete(
	"/queued-backup-execution/:id",
	async (req: Request, resp: Response) => {
		await queuedBackupExecutionRepository.deletee(parseInt(req.params.id));

		resp.status(200).send();
	}
);
