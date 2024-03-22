import express, { Request, Response } from "express";
import {
	BackupSecret,
	backupSecretRepository,
	EncryptionType,
} from "../repository/backup-secret.repository";
require("express-async-errors");

export const backupSecretRouter = express.Router();

backupSecretRouter.post("/secret", async (req: Request, resp: Response) => {
	const newItem = new BackupSecret();
	newItem.backupExecutionId = parseInt(req.body.backupExecutionId);
	newItem.encryptionType = Object.entries(EncryptionType).find(([_key, val]) => {
		return val === req.body.encryptionType;
	})?.[1] as EncryptionType;
	newItem.orderNumber = parseInt(req.body.orderNumber);
	newItem.secretValue = req.body.secretValue;
	const item = await backupSecretRepository.create(newItem);

	resp.status(200).send(item);
});

backupSecretRouter.get("/secret", async (req: Request, resp: Response) => {
	const items = await backupSecretRepository.getAll();

	resp.status(200).send(items);
});

backupSecretRouter.get("/secret/:id", async (req: Request, resp: Response) => {
	const item = await backupSecretRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

backupSecretRouter.put("/secret", async (req: Request, resp: Response) => {
	const updateItem = await backupSecretRepository.getById(parseInt(req.body.id));
	updateItem.backupExecutionId = parseInt(req.body.backupExecutionId);
	updateItem.encryptionType = Object.entries(EncryptionType).find(([_key, val]) => {
		return val === req.body.encryptionType;
	})?.[1] as EncryptionType;
	updateItem.orderNumber = parseInt(req.body.orderNumber);
	updateItem.secretValue = req.body.secretValue;
	await backupSecretRepository.update(updateItem);

	resp.status(200).send();
});

backupSecretRouter.delete("/secret/:id", async (req: Request, resp: Response) => {
	await backupSecretRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
