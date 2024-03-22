import express, { Request, Response } from "express";
import { queuedBackupExecutionRepository } from "../repository/queued-backup-execution.repository";
import { BatchExecutionDto, batchService } from "../service/batch.service";
require("express-async-errors");

export const batchExecutionRouter = express.Router();

batchExecutionRouter.post("/batch", async (req: Request, resp: Response) => {
	const batchExecution: BatchExecutionDto = {
		preservationTargetCategoryForBatch: req.body.preservationTargetCategoryForBatch,
		batchBackupCategory: req.body.batchBackupCategory,
		batchUploadDestination: req.body.batchUploadDestination,
		batchUploadPath: req.body.batchUploadPath,
		batchSecondUploadDestination: req.body.batchSecondUploadDestination,
		batchSecondUploadPath: req.body.batchSecondUploadPath,
	};

	await batchService.createBatch(batchExecution);

	resp.status(200).send("Success");
});

//Not consumed from bfe-frontend. Intended for integration with other systems
batchExecutionRouter.get(
	"/batch/:targetCategory/:backupCategory",
	async (req: Request, resp: Response) => {
		const preservationTargetCategoryForBatch = req.params.targetCategory;
		const batchBackupCategory = req.params.backupCategory;

		await batchService.createBatchWithDefaults(
			preservationTargetCategoryForBatch,
			batchBackupCategory
		);

		resp.status(200).send("Success");
	}
);

batchExecutionRouter.delete("/", async (req: Request, resp: Response) => {
	await queuedBackupExecutionRepository.deleteAll();

	resp.status(200).send("All deleted now");
});
