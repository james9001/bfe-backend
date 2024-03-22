import express, { Request, Response } from "express";
import { getApplicationConfig } from "../../../misc/application-config.singleton";
import { checksumService } from "../../common/service/checksum.service";
import { loggingService } from "../../common/service/logging.service";
import { massRenamingService } from "../../common/service/mass-renaming.service";
import { backupMainService } from "../backup.main.service";
import { backupExecutionRepository } from "../repository/backup-execution.repository";
import { backupTargetCopyingService } from "../service/backup-target-copying.service";
import { encryptionService } from "../service/encryption.service";
import { gzipService } from "../service/gzip.service";
import { processablePiecePreparationService } from "../service/processable-piece-preparation.service";
import { subarchiveCreationService } from "../service/subarchive-creation.service";
import { tarCreationService } from "../service/tar-creation.service";
import { validationService } from "../service/validation.service";
require("express-async-errors");

export const backupDebugRouter = express.Router();

backupDebugRouter.post("/phase0", async (req: Request, resp: Response) => {
	const requestBody = req.body;

	const exec = await backupMainService.setupAndGetNewBackupBfeExecution(
		requestBody.preservationTargetId,
		requestBody.backupCategory
	);

	const respBody: PreparationResponse = {
		backupExecutionId: exec.id,
	};

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 0 DONE");

	resp.status(200).send(respBody);
});

interface PreparationResponse {
	readonly backupExecutionId: number;
}

backupDebugRouter.post("/phase1", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	const exec = await backupExecutionRepository.getById(requestBody.backupExecutionId);

	await backupTargetCopyingService.copyPreservationTargetToTemp(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 1 DONE");

	resp.status(200).send();
});

backupDebugRouter.post("/phase2", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	const exec = await backupExecutionRepository.getById(requestBody.backupExecutionId);

	await checksumService.getChecksumForBackupExecution(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 2 DONE");

	resp.status(200).send();
});

backupDebugRouter.post("/phase3", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	const exec = await backupExecutionRepository.getById(requestBody.backupExecutionId);

	await tarCreationService.createTarFromBackupTarget(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 3 DONE");

	resp.status(200).send();
});

backupDebugRouter.post("/phase4", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	const exec = await backupExecutionRepository.getById(requestBody.backupExecutionId);

	await subarchiveCreationService.splitOriginalTarIntoSubarchives(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 4 DONE");

	resp.status(200).send();
});

backupDebugRouter.post("/phase5", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	const exec = await backupExecutionRepository.getById(requestBody.backupExecutionId);

	const processablePieces =
		await processablePiecePreparationService.processSubarchivesIntoProcessablePieces(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 5 DONE");

	resp.status(200).send(processablePieces);
});

backupDebugRouter.post("/phase6", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	const processablePieces = requestBody.processablePieces;

	const gzippedPieces = await gzipService.gzipAllPieces(processablePieces);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 6 DONE");

	resp.status(200).send(gzippedPieces);
});

//Technically phase 7 runs twice, for the different encryptions, but not necessary to test
backupDebugRouter.post("/phase7", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	const exec = await backupExecutionRepository.getById(requestBody.backupExecutionId);
	const processablePieces = requestBody.processablePieces;
	const isAes = requestBody.isAes;

	const encryptedPieces = await encryptionService.encryptAllPieces(exec, processablePieces, isAes);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 7 DONE");

	resp.status(200).send(encryptedPieces);
});

backupDebugRouter.post("/phase8", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	const exec = await backupExecutionRepository.getById(requestBody.backupExecutionId);
	const processablePieces = requestBody.processablePieces;

	await validationService.doAllValidations(exec, processablePieces);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 8 DONE");

	resp.status(200).send();
});

backupDebugRouter.post("/phase9", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	const exec = await backupExecutionRepository.getById(requestBody.backupExecutionId);

	await massRenamingService.changeAllPiecesNamesToHaveProvidedFileExtensions(
		[],
		getApplicationConfig().appTmp + "/dir_" + exec.artefactName
	);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 9 DONE");

	resp.status(200).send();
});

backupDebugRouter.post("/phase10", async (req: Request, resp: Response) => {
	const requestBody = req.body;
	await backupExecutionRepository.getById(requestBody.backupExecutionId);

	//await recordWritingService.writeRecordsForBackup(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 10 DONE");

	resp.status(200).send();
});

backupDebugRouter.post("/execute", async (req: Request, resp: Response) => {
	const exec = await backupMainService.setupAndGetNewBackupBfeExecution(
		req.body.request.preservationTargetId,
		req.body.request.backupCategory
	);

	void backupMainService.runBackup(exec);

	resp.status(200).send("Started backup... doing upload?: " + req.body.request.doUpload);
});
