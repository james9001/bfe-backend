import express, { Request, Response } from "express";
import { backupMainService } from "../../backup/backup.main.service";
import { preservationTargetRepository } from "../../backup/repository/preservation-target.repository";
import { restorationMainService } from "../../restoration/restoration.main.service";
import { uploadMainService } from "../../upload/upload.main.service";
import { commonMainService } from "../common.main.service";
import {
	applicationStateRepository,
	ApplicationStateStatus,
} from "../repository/application-state.repository";
require("express-async-errors");

export const executionRouter = express.Router();

executionRouter.post("/backup", async (req: Request, resp: Response) => {
	const preservationTargetId = parseInt(req.body.preservationTargetId);

	if (preservationTargetId < 1 || !req.body.backupCategory) {
		throw new Error("Invalid");
	}

	//calling this early to validate
	await preservationTargetRepository.getById(preservationTargetId);

	const globalState = await applicationStateRepository.get();
	if (globalState._status != ApplicationStateStatus.FREE) {
		throw new Error("BFE is busy!");
	}

	const exec = await backupMainService.setupAndGetNewBackupBfeExecution(
		preservationTargetId,
		req.body.backupCategory
	);

	void backupMainService.runBackup(exec);

	resp.status(200).send("Started backup...");
});

executionRouter.post("/restoration", async (req: Request, resp: Response) => {
	if (
		!req.body.aesPassword ||
		!req.body.camelliaPassword ||
		!req.body.category ||
		!req.body.checksum ||
		!req.body.sourceDir ||
		!req.body.destinationDir
	) {
		throw new Error("Invalid");
	}
	const globalState = await applicationStateRepository.get();
	if (globalState._status != ApplicationStateStatus.FREE) {
		throw new Error("BFE is busy!");
	}

	void restorationMainService.runRestoration(
		req.body.aesPassword,
		req.body.camelliaPassword,
		req.body.category,
		req.body.checksum,
		req.body.sourceDir,
		req.body.destinationDir
	);

	resp.status(200).send("Started restoration...");
});

executionRouter.post("/upload", async (req: Request, resp: Response) => {
	if (!req.body.destination || !req.body.destinationPath) {
		throw new Error("Invalid");
	}

	await uploadMainService.createNewActiveUploadExecution(
		req.body.destination,
		req.body.destinationPath
	);

	resp.status(200).send("Created UploadExecution");
});

executionRouter.post("/terminate", async (req: Request, resp: Response) => {
	void commonMainService.terminateGlobalAction();
	resp.status(200).send("Terminating...");
});

executionRouter.post("/upload/action/pause", async (req: Request, resp: Response) => {
	await uploadMainService.pauseCurrentUploadExecution();
	resp.status(200).send("Done");
});
executionRouter.post("/upload/action/resume", async (req: Request, resp: Response) => {
	await uploadMainService.resumeCurrentUploadExecution();
	resp.status(200).send("Done");
});
executionRouter.post("/upload/action/remove", async (req: Request, resp: Response) => {
	await uploadMainService.removeCurrentUploadExecution();
	resp.status(200).send("Done");
});
executionRouter.post("/upload/action/start", async (req: Request, resp: Response) => {
	await uploadMainService.startCurrentUploadExecution();
	resp.status(200).send("Done");
});
executionRouter.post("/upload/action/finalise", async (req: Request, resp: Response) => {
	await uploadMainService.finaliseCurrentUploadExecution();
	resp.status(200).send("Done");
});
