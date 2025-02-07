import express, { Request, Response } from "express";
import { preservationTargetAutoCreatorService } from "../service/preservation-target-auto-creator.service";
require("express-async-errors");

export const preservationTargetAutoCreatorRouter = express.Router();

preservationTargetAutoCreatorRouter.post("/run", async (req: Request, resp: Response) => {
	await preservationTargetAutoCreatorService.autoCreatePreservationTargetsForWatchDirectories(
		req.body.watchDirectories,
		req.body.preservationTargetType,
		req.body.preservationTargetCategory
	);

	resp.status(200).send("Preservation Target auto-creation was successful");
});

preservationTargetAutoCreatorRouter.post("/oops", async (req: Request, resp: Response) => {
	await preservationTargetAutoCreatorService.oopsDeleteAllPreservationTargets();
	resp.status(200).send("Successfully deleted all existing Preservation Targets");
});
