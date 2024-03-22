import express, { Request, Response } from "express";
import {
	ApplicationState,
	applicationStateRepository,
	ApplicationStateStatus,
} from "../repository/application-state.repository";
require("express-async-errors");

export const applicationStateDebugRouter = express.Router();

applicationStateDebugRouter.get("/status/free", async (req: Request, resp: Response) => {
	await setStatus(ApplicationStateStatus.FREE);
	resp.status(200).send();
});

applicationStateDebugRouter.get("/status/doing-backup", async (req: Request, resp: Response) => {
	await setStatus(ApplicationStateStatus.DOING_BACKUP);
	resp.status(200).send();
});

applicationStateDebugRouter.get("/status/doing-upload", async (req: Request, resp: Response) => {
	await setStatus(ApplicationStateStatus.DOING_UPLOAD);
	resp.status(200).send();
});

applicationStateDebugRouter.get(
	"/status/doing-restoration",
	async (req: Request, resp: Response) => {
		await setStatus(ApplicationStateStatus.DOING_RESTORATION);
		resp.status(200).send();
	}
);

applicationStateDebugRouter.put("/state", async (req: Request, resp: Response) => {
	const currentStateEntity = await applicationStateRepository.get();
	const updateItem = new ApplicationState();
	updateItem.id = currentStateEntity.id;

	updateItem._status = Object.entries(ApplicationStateStatus).find(([_key, val]) => {
		return val === req.body.status;
	})?.[1] as ApplicationStateStatus;
	updateItem.currentBackupExecutionId = req.body.currentBackupExecutionId;
	updateItem.currentUploadExecutionId = req.body.currentUploadExecutionId;
	updateItem.currentRestorationExecutionId = req.body.currentRestorationExecutionId;
	updateItem.inErrorState = req.body.inErrorState;
	updateItem.inAutomaticMode = req.body.inAutomaticMode;

	await applicationStateRepository.update(updateItem, false);

	resp.status(200).send();
});

const setStatus = async (toSet: ApplicationStateStatus): Promise<void> => {
	const state = await applicationStateRepository.get();
	state._status = toSet;
	await applicationStateRepository.update(state);
};
