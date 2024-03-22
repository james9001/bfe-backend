import express, { Request, Response } from "express";
import {
	PreservationTarget,
	preservationTargetRepository,
	PreservationTargetType,
} from "../repository/preservation-target.repository";
require("express-async-errors");

export const preservationTargetRouter = express.Router();

preservationTargetRouter.post("/target", async (req: Request, resp: Response) => {
	const newItem = new PreservationTarget();
	newItem.type = Object.entries(PreservationTargetType).find(([_key, val]) => {
		return val === req.body.type;
	})?.[1] as PreservationTargetType;
	newItem.fullPath = req.body.fullPath;
	newItem.priorityLabel = req.body.priorityLabel;
	newItem.category = req.body.category;
	newItem.name = req.body.name;
	const item = await preservationTargetRepository.create(newItem);

	resp.status(200).send(item);
});

preservationTargetRouter.get("/target", async (req: Request, resp: Response) => {
	const items = await preservationTargetRepository.getAll();

	resp.status(200).send(items);
});

preservationTargetRouter.get("/target/:id", async (req: Request, resp: Response) => {
	const item = await preservationTargetRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

preservationTargetRouter.put("/target", async (req: Request, resp: Response) => {
	const updateItem = await preservationTargetRepository.getById(parseInt(req.body.id));
	updateItem.type = Object.entries(PreservationTargetType).find(([_key, val]) => {
		return val === req.body.type;
	})?.[1] as PreservationTargetType;
	updateItem.fullPath = req.body.fullPath;
	updateItem.priorityLabel = req.body.priorityLabel;
	updateItem.category = req.body.category;
	updateItem.name = req.body.name;
	await preservationTargetRepository.update(updateItem);

	resp.status(200).send();
});

preservationTargetRouter.delete("/target/:id", async (req: Request, resp: Response) => {
	await preservationTargetRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
