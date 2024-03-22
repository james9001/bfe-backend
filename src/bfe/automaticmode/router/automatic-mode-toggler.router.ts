import express, { Request, Response } from "express";
import { applicationStateRepository } from "../../common/repository/application-state.repository";
require("express-async-errors");

export const automaticModeTogglerRouter = express.Router();

automaticModeTogglerRouter.put("/toggle", async (req: Request, resp: Response) => {
	const state = await applicationStateRepository.get();
	state.inAutomaticMode = req.body.inAutomaticMode;
	await applicationStateRepository.update(state, false);
	resp.status(200).send();
});
