import { backupExecutionRepository } from "../../backup/repository/backup-execution.repository";
import { commonMainService } from "../../common/common.main.service";
import { applicationStateRepository } from "../../common/repository/application-state.repository";
import {
	awaitingKillStateGlobal,
	ChildProcessCommand,
	childProcessEventEmitter,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import {
	UploadExecution,
	uploadExecutionRepository,
	UploadStatus,
} from "../repository/upload-execution.repository";
import { AbstractUploaderService } from "./abstract-uploader.service";

export class CopypastaUploaderService extends AbstractUploaderService {
	public override async onStartUpload(): Promise<void> {
		void this.runUploadProcess();
	}
	public override async onPauseUpload(): Promise<void> {
		void commonMainService.killCurrentProcess();
	}
	public override async onResumeUpload(): Promise<void> {
		void this.runUploadProcess();
	}
	public override async onRemoveUpload(): Promise<void> {
		//Probably nothing
	}
	public override async onFinaliseUpload(): Promise<void> {
		//Probably nothing
	}

	private async runUploadProcess(): Promise<void> {
		const uploadExecution = await this.getCurrentUploadExecution();
		try {
			await this.runCopyCommand(uploadExecution);

			uploadExecution.status = UploadStatus.COMPLETE;
			uploadExecution.completedTime = "" + Date.now();
			await uploadExecutionRepository.update(uploadExecution);
			console.log(`UploadStatus is now ${uploadExecution.status}`);

			//Clean up child process event emitter
			childProcessEventEmitter.removeAllListeners("KillCurrentProcess");
		} catch (err: any) {
			childProcessEventEmitter.removeAllListeners("KillCurrentProcess");
			if (awaitingKillStateGlobal.isAwaitingKill) {
				awaitingKillStateGlobal.isAwaitingKill = false;
				awaitingKillStateGlobal.mostRecentKillOutcome = "nice and tidy";
				await loggingService.logAndPrint(
					"Caught error in the CopypastaUploaderService runBackup async process. It seems to have been intentional."
				);
			} else {
				await applicationStateRepository.markAsErrorState();
				await loggingService.logAndPrint(
					"Caught unexpected error in the CopypastaUploaderService runBackup async process!"
				);
			}
			await loggingService.logAndPrint(err);
		}
	}

	private async runCopyCommand(uploadExecution: UploadExecution): Promise<void> {
		const backupExecution = await backupExecutionRepository.getById(
			uploadExecution.backupExecutionId
		);

		const command: ChildProcessCommand = {
			executable: "cp",
			argumentz: ["-R", "dir_" + backupExecution.artefactName, uploadExecution.destinationPath],
		};
		await childProcessService.executeChildProcess(command);
	}

	private getCurrentUploadExecution = async (): Promise<UploadExecution> => {
		const globalState = await applicationStateRepository.get();
		const currentUploadExecution = await uploadExecutionRepository.getById(
			globalState.currentUploadExecutionId
		);
		return currentUploadExecution;
	};
}

export const copypastaUploaderService = new CopypastaUploaderService();
