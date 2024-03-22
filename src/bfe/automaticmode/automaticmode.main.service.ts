import { backupMainService } from "../backup/backup.main.service";
import {
	applicationStateRepository,
	ApplicationStateStatus,
} from "../common/repository/application-state.repository";
import { loggingService } from "../common/service/logging.service";
import {
	uploadExecutionRepository,
	UploadStatus,
} from "../upload/repository/upload-execution.repository";
import {
	QueuedBackupExecution,
	queuedBackupExecutionRepository,
} from "./repository/queued-backup-execution.repository";
import { uploadMainService } from "../upload/upload.main.service";
import { commonMainService } from "../common/common.main.service";
import { applicationSettingsRepository } from "../common/repository/application-settings.repository";

export class AutomaticModeMainService {
	public doingSomething = false;

	public async onApplicationStart(): Promise<void> {
		await loggingService.logAndPrint("Automatic Mode: preparing...");
		const intervalExec = async () => {
			await this.onIntervalExecution();
		};
		setInterval(intervalExec, 5000);
	}

	private async onIntervalExecution(): Promise<void> {
		try {
			if (!this.doingSomething) {
				const state = await applicationStateRepository.get();
				if (state.inAutomaticMode) {
					if (state._status == ApplicationStateStatus.DOING_UPLOAD) {
						void this.onIntervalDoingUpload();
					}
					if (state._status == ApplicationStateStatus.DOING_BACKUP) {
						void this.onIntervalDoingBackup();
					}
					if (state._status == ApplicationStateStatus.FREE) {
						void this.onIntervalFree();
					}
				}
			} else {
				await loggingService.logAndPrint("Automatic Mode peon says: Me busy! Leave me alone!");
			}
		} catch (err: any) {
			await applicationStateRepository.markAsErrorState();
			await loggingService.logAndPrint(
				"Caught unexpected error in the AutomaticModeMainService onIntervalExecution async process!"
			);
			await loggingService.logAndPrint(err);
		}
	}

	private async onIntervalDoingUpload(): Promise<void> {
		this.doingSomething = true;
		const state = await applicationStateRepository.get();
		if (state.currentUploadExecutionId > -1) {
			const currentUploadExecution = await uploadExecutionRepository.getById(
				state.currentUploadExecutionId
			);
			if (currentUploadExecution.status == UploadStatus.COMPLETE) {
				await this.finishUpUploadExecutionAndTerminateStateIfDesiredUploadCount();
			}
			if (
				currentUploadExecution.status == UploadStatus.NOT_STARTED ||
				currentUploadExecution.status == UploadStatus.PAUSED
			) {
				//Theoretically this could happen when user enables auto mode whilst in this state
				//But its not really supported for now so just turn off auto mode
				state.inAutomaticMode = false;
				await applicationStateRepository.update(state, false);
			}
		} else {
			await this.createNewUploadExecutionAndStartIt();
		}
		this.doingSomething = false;
	}

	private async createNewUploadExecutionAndStartIt(): Promise<void> {
		const state = await applicationStateRepository.get();

		const currentQueuedExec = (await queuedBackupExecutionRepository.getAll()).filter(
			(queuedExec) => queuedExec.actualBackupExecutionId == state.currentBackupExecutionId
		)[0];

		const uploadExecs = await uploadExecutionRepository.getByBackupExecutionId(
			currentQueuedExec.actualBackupExecutionId
		);

		//TODO: This inherently isn't really hard coded with the 2-upload target thing, but it assumes it
		if (uploadExecs.length > 0) {
			await loggingService.logAndPrint("Automatic Mode: creating second upload and starting it...");
			await uploadMainService.createNewActiveUploadExecution(
				currentQueuedExec.secondIntendedUploadDestination,
				currentQueuedExec.secondIntendedUploadPath
			);
		} else {
			await loggingService.logAndPrint("Automatic Mode: creating first upload and starting it...");
			await uploadMainService.createNewActiveUploadExecution(
				currentQueuedExec.intendedUploadDestination,
				currentQueuedExec.intendedUploadPath
			);
		}

		await uploadMainService.startCurrentUploadExecution();
	}

	private async finishUpUploadExecutionAndTerminateStateIfDesiredUploadCount(): Promise<void> {
		await loggingService.logAndPrint("Automatic Mode: finalising the completed upload et cetera...");

		const state = await applicationStateRepository.get();

		const currentQueuedExec = (await queuedBackupExecutionRepository.getAll()).filter(
			(queuedExec) => queuedExec.actualBackupExecutionId == state.currentBackupExecutionId
		)[0];

		const uploadExecs = await uploadExecutionRepository.getByBackupExecutionId(
			currentQueuedExec.actualBackupExecutionId
		);

		await uploadMainService.finaliseCurrentUploadExecution();

		const isFinishTime = (await applicationSettingsRepository.get()).uploadToTwoTargets
			? uploadExecs.length > 1
			: uploadExecs.length > 0;

		if (isFinishTime) {
			await commonMainService.terminateGlobalAction();
			await queuedBackupExecutionRepository.deletee(currentQueuedExec.id);
		}
	}

	private async onIntervalDoingBackup(): Promise<void> {
		//await loggingService.logAndPrint("Automatic Mode: we are in Doing Backup status. Waiting...");
	}

	private async onIntervalFree(): Promise<void> {
		this.doingSomething = true;
		const existingQueuedBackupExecutions = await queuedBackupExecutionRepository.getAll();
		if (existingQueuedBackupExecutions.length > 0) {
			await loggingService.logAndPrint("Automatic Mode: Starting the next backup execution...");
			const nextInQueue = existingQueuedBackupExecutions
				.sort((a, b) => b.orderNumber - a.orderNumber)
				.pop() as QueuedBackupExecution;
			await this.startBackupExecutionFromQueuedBackupExecution(nextInQueue);
		}
		this.doingSomething = false;
	}

	private async startBackupExecutionFromQueuedBackupExecution(
		toExecute: QueuedBackupExecution
	): Promise<void> {
		const exec = await backupMainService.setupAndGetNewBackupBfeExecution(
			toExecute.preservationTargetId,
			toExecute.intendedBackupCategory
		);
		toExecute.actualBackupExecutionId = exec.id;
		await queuedBackupExecutionRepository.update(toExecute);
		void backupMainService.runBackup(exec);
	}
}

export const automaticModeMainService = new AutomaticModeMainService();
