import express, { Request, Response } from "express";
import { getApplicationConfig } from "../../../misc/application-config.singleton";
import { checksumService } from "../../common/service/checksum.service";
import { loggingService } from "../../common/service/logging.service";
import { massRenamingService } from "../../common/service/mass-renaming.service";
import { restorationExecutionRepository } from "../repository/restoration-execution.repository";
import { restorationMainService } from "../restoration.main.service";
import { decryptionService } from "../service/decryption.service";
import { restorationTargetCopyingService } from "../service/restoration-target-copying.service";
import { splitRecombinationService } from "../service/split-recombination.service";
import { tarExtractionService } from "../service/tar-extraction.service";
import { ungzipService } from "../service/ungzip.service";
require("express-async-errors");

export const restorationDebugRouter = express.Router();

restorationDebugRouter.post("/phase0", async (req: Request, resp: Response) => {
	const exec = await restorationMainService.setupAndGetNewRestorationBfeExecution(
		req.body.aesPassword,
		req.body.camelliaPassword,
		req.body.category,
		req.body.checksum,
		req.body.sourceDir,
		req.body.destinationDir
	);

	const respBody: PreparationResponse = {
		restorationExecutionId: exec.id,
	};

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 0 DONE");

	resp.status(200).send(respBody);
});

interface PreparationResponse {
	readonly restorationExecutionId: number;
}

restorationDebugRouter.post("/phase1", async (req: Request, resp: Response) => {
	const exec = await restorationExecutionRepository.getById(req.body.restorationExecutionId);

	await restorationTargetCopyingService.copyBackupForRestoringIntoTemp(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 1 DONE");

	resp.status(200).send();
});

restorationDebugRouter.post("/phase2", async (req: Request, resp: Response) => {
	const exec = await restorationExecutionRepository.getById(req.body.restorationExecutionId);

	const renamedPieces = await massRenamingService.changeAllPiecesNamesToHaveProvidedFileExtensions(
		[".gz", ".gpg", ".gpg"],
		getApplicationConfig().appTmp + "/" + exec.backupDirName
	);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 2 DONE");

	resp.status(200).send(renamedPieces);
});

restorationDebugRouter.post("/phase3", async (req: Request, resp: Response) => {
	const exec = await restorationExecutionRepository.getById(req.body.restorationExecutionId);

	const decryptedPieces = await decryptionService.decryptAllPieces(
		exec,
		req.body.pieces,
		req.body.isAes
	);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 3 DONE");

	resp.status(200).send(decryptedPieces);
});

restorationDebugRouter.post("/phase4", async (req: Request, resp: Response) => {
	const uncompressedPieces = await ungzipService.ungzipAllPieces(req.body.pieces);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 4 DONE");

	resp.status(200).send(uncompressedPieces);
});

restorationDebugRouter.post("/phase5", async (req: Request, resp: Response) => {
	const exec = await restorationExecutionRepository.getById(req.body.restorationExecutionId);

	await splitRecombinationService.recombineAllSplitSubarchives(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 5 DONE");

	resp.status(200).send();
});

restorationDebugRouter.post("/phase6", async (req: Request, resp: Response) => {
	const exec = await restorationExecutionRepository.getById(req.body.restorationExecutionId);

	await tarExtractionService.extractAllTarArchivesInDirectory(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 6 DONE");

	resp.status(200).send(exec);
});

restorationDebugRouter.post("/phase7", async (req: Request, resp: Response) => {
	const exec = await restorationExecutionRepository.getById(req.body.restorationExecutionId);
	exec.preservationTargetRevealed = req.body.preservationTargetRevealed;

	await checksumService.compareRestoredChecksumWithStatedChecksum(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 7 DONE");

	resp.status(200).send();
});

restorationDebugRouter.post("/phase8", async (req: Request, resp: Response) => {
	const exec = await restorationExecutionRepository.getById(req.body.restorationExecutionId);
	exec.preservationTargetRevealed = req.body.preservationTargetRevealed;

	await restorationTargetCopyingService.moveRestoredBackupToDestinationDir(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 8 DONE");

	resp.status(200).send();
});

restorationDebugRouter.post("/phase9", async (req: Request, resp: Response) => {
	const exec = await restorationExecutionRepository.getById(req.body.restorationExecutionId);
	exec.preservationTargetRevealed = req.body.preservationTargetRevealed;

	//await recordWritingService.writeRecordsForRestoration(exec);

	await loggingService.logAndPrint("----------------------------------------------------");
	await loggingService.logAndPrint("PHASE 9 DONE");

	resp.status(200).send();
});

restorationDebugRouter.post("/execute", async (req: Request, resp: Response) => {
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
