import express, { Request, Response } from "express";
import {
	EncryptionType,
	RestorationSecret,
	restorationSecretRepository,
} from "../repository/restoration-secret.repository";
require("express-async-errors");

export const restorationSecretRouter = express.Router();

restorationSecretRouter.post("/secret", async (req: Request, resp: Response) => {
	const newItem = new RestorationSecret();
	newItem.restorationExecutionId = parseInt(req.body.restorationExecutionId);
	newItem.encryptionType = Object.entries(EncryptionType).find(([_key, val]) => {
		return val === req.body.encryptionType;
	})?.[1] as EncryptionType;
	newItem.orderNumber = parseInt(req.body.orderNumber);
	newItem.secretValue = req.body.secretValue;
	const item = await restorationSecretRepository.create(newItem);

	resp.status(200).send(item);
});

restorationSecretRouter.get("/secret", async (req: Request, resp: Response) => {
	const items = await restorationSecretRepository.getAll();

	resp.status(200).send(items);
});

restorationSecretRouter.get("/secret/:id", async (req: Request, resp: Response) => {
	const item = await restorationSecretRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

restorationSecretRouter.put("/secret", async (req: Request, resp: Response) => {
	const updateItem = await restorationSecretRepository.getById(parseInt(req.body.id));
	updateItem.restorationExecutionId = parseInt(req.body.restorationExecutionId);
	updateItem.encryptionType = Object.entries(EncryptionType).find(([_key, val]) => {
		return val === req.body.encryptionType;
	})?.[1] as EncryptionType;
	updateItem.orderNumber = parseInt(req.body.orderNumber);
	updateItem.secretValue = req.body.secretValue;
	await restorationSecretRepository.update(updateItem);

	resp.status(200).send();
});

restorationSecretRouter.delete("/secret/:id", async (req: Request, resp: Response) => {
	await restorationSecretRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
