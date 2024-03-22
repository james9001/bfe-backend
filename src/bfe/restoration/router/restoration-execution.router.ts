import express, { Request, Response } from "express";
import {
	RestorationExecution,
	restorationExecutionRepository,
} from "../repository/restoration-execution.repository";

require("express-async-errors");

export const restorationRouter = express.Router();

restorationRouter.post("/execution", async (req: Request, resp: Response) => {
	const newItem = new RestorationExecution();
	newItem.sourceDir = req.body.sourceDir;
	newItem.destinationDir = req.body.destinationDir;
	newItem.preservationTargetRevealed = req.body.preservationTargetRevealed;
	newItem.category = req.body.category;
	newItem.checksum = { checksumValue: req.body.checksum.checksumValue };
	const item = await restorationExecutionRepository.create(newItem);

	resp.status(200).send(item);
});

restorationRouter.get("/execution", async (req: Request, resp: Response) => {
	const items = await restorationExecutionRepository.getAll();

	resp.status(200).send(items);
});

restorationRouter.get("/execution/:id", async (req: Request, resp: Response) => {
	const item = await restorationExecutionRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

restorationRouter.put("/execution", async (req: Request, resp: Response) => {
	const updateItem = await restorationExecutionRepository.getById(parseInt(req.body.id));
	updateItem.sourceDir = req.body.sourceDir;
	updateItem.destinationDir = req.body.destinationDir;
	updateItem.preservationTargetRevealed = req.body.preservationTargetRevealed;
	updateItem.category = req.body.category;
	updateItem.checksum = { checksumValue: req.body.checksum.checksumValue };
	await restorationExecutionRepository.update(updateItem);

	resp.status(200).send();
});

restorationRouter.delete("/execution/:id", async (req: Request, resp: Response) => {
	await restorationExecutionRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
