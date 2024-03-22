import { preservationTargetRepository } from "../../backup/repository/preservation-target.repository";
import { applicationSettingsRepository } from "../../common/repository/application-settings.repository";
import {
	QueuedBackupExecution,
	queuedBackupExecutionRepository,
} from "../repository/queued-backup-execution.repository";

export class BatchService {
	public async createBatch(model: BatchExecutionDto): Promise<void> {
		const selectedTargets = (await preservationTargetRepository.getAll()).filter(
			(target) => target.category == model.preservationTargetCategoryForBatch
		);

		let orderNumber = await this.getStartingOrderNumber();

		for (const target of selectedTargets) {
			const exec = new QueuedBackupExecution();
			exec.preservationTargetId = target.id;
			exec.orderNumber = orderNumber++;
			exec.intendedBackupCategory = model.batchBackupCategory;
			exec.intendedUploadDestination = model.batchUploadDestination;
			exec.intendedUploadPath = model.batchUploadPath;
			exec.secondIntendedUploadDestination = model.batchSecondUploadDestination;
			exec.secondIntendedUploadPath = model.batchSecondUploadPath;
			await queuedBackupExecutionRepository.create(exec);
		}
	}

	private async getStartingOrderNumber(): Promise<number> {
		const existingQueuedBackupExecutions = await queuedBackupExecutionRepository.getAll();
		return (
			(existingQueuedBackupExecutions.length > 0
				? (existingQueuedBackupExecutions
						.map((queuedExec) => queuedExec.orderNumber)
						.sort((a, b) => a - b)
						.pop() as number)
				: 0) + 1
		);
	}

	public async createBatchWithDefaults(
		preservationTargetCategoryForBatch: string,
		batchBackupCategory: string
	): Promise<void> {
		const settings = await applicationSettingsRepository.get();

		const batchExecution: BatchExecutionDto = {
			preservationTargetCategoryForBatch: preservationTargetCategoryForBatch,
			batchBackupCategory: batchBackupCategory,
			batchUploadDestination: settings.defaultUploadDestination,
			batchUploadPath: settings.defaultUploadPath,
			batchSecondUploadDestination: settings.defaultSecondUploadDestination,
			batchSecondUploadPath: settings.defaultSecondUploadPath,
		};

		void batchService.createBatch(batchExecution);
	}
}

export const batchService = new BatchService();

export interface BatchExecutionDto {
	preservationTargetCategoryForBatch: string;
	batchBackupCategory: string;
	batchUploadDestination: string;
	batchUploadPath: string;
	batchSecondUploadDestination: string;
	batchSecondUploadPath: string;
}
