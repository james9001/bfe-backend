import express, { Request, Response } from "express";
import {
	BackupExecution,
	backupExecutionRepository,
} from "../../backup/repository/backup-execution.repository";
import {
	PreservationTarget,
	preservationTargetRepository,
} from "../../backup/repository/preservation-target.repository";
import {
	UploadExecution,
	uploadExecutionRepository,
} from "../repository/upload-execution.repository";
require("express-async-errors");

export const uploadDebugRouter = express.Router();

uploadDebugRouter.post("/phaseu", async (req: Request, resp: Response) => {
	//create preservation target
	//...
	const newTarg = new PreservationTarget();
	const targ = await preservationTargetRepository.create(newTarg);

	//create backup execution
	//...
	const newBackupExec = new BackupExecution();
	newBackupExec.preservationTargetId = targ.id;
	const backupExec = await backupExecutionRepository.create(newBackupExec);

	//now create the actual entity we care about
	const newExec = new UploadExecution();
	newExec.backupExecutionId = backupExec.id;
	const exec = await uploadExecutionRepository.create(newExec);

	console.log("This is the persisted exec");
	console.log(exec);

	//await RcloneService.runRclone(exec);

	resp.status(200).send();
});
