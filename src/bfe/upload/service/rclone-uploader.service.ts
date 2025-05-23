import { getApplicationConfig } from "../../../misc/application-config.singleton";
import { backupExecutionRepository } from "../../backup/repository/backup-execution.repository";
import { commonMainService } from "../../common/common.main.service";
import { applicationSettingsRepository } from "../../common/repository/application-settings.repository";
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

export class RcloneUploaderService extends AbstractUploaderService {
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
			await this.runRcloneCommand(uploadExecution);

			uploadExecution.status = UploadStatus.COMPLETE;
			uploadExecution.completedTime = "" + Date.now();
			await uploadExecutionRepository.update(uploadExecution);
			console.log(`UploadStatus is now ${uploadExecution.status}`);

			//Clean up child process event emitter
			childProcessEventEmitter.removeAllListeners("KillCurrentProcess");
			await loggingService.logAndPrint("Rclone Uploader Service - runUploadProcess is finished");
		} catch (err: any) {
			childProcessEventEmitter.removeAllListeners("KillCurrentProcess");
			if (awaitingKillStateGlobal.isAwaitingKill) {
				awaitingKillStateGlobal.isAwaitingKill = false;
				awaitingKillStateGlobal.mostRecentKillOutcome = "nice and tidy";
				await loggingService.logAndPrint(
					"Caught error in the RcloneUploaderService runBackup async process. It seems to have been intentional."
				);
			} else {
				await applicationStateRepository.markAsErrorState();
				await loggingService.logAndPrint(
					"Caught unexpected error in the RcloneUploaderService runBackup async process!"
				);
			}
			await loggingService.logAndPrint(err);
		}
	}

	private async runRcloneCommand(uploadExecution: UploadExecution): Promise<void> {
		const settings = await applicationSettingsRepository.get();

		const backupExecution = await backupExecutionRepository.getById(
			uploadExecution.backupExecutionId
		);

		const rcloneDestArg = uploadExecution.destinationPath + "/" + backupExecution.category + "/";

		const command: ChildProcessCommand = {
			executable: "rclone",
			argumentz: [
				"--stats",
				"15s",
				"--bwlimit",
				settings.rcloneBwLimit,
				"--config=" + getApplicationConfig().rcloneConfPath,
				"-P",
				"copy",
				getApplicationConfig().appTmp,
				rcloneDestArg,
			],
		};
		await childProcessService.executeChildProcess(command, true, false, false);
	}

	private getCurrentUploadExecution = async (): Promise<UploadExecution> => {
		const globalState = await applicationStateRepository.get();
		const currentUploadExecution = await uploadExecutionRepository.getById(
			globalState.currentUploadExecutionId
		);
		return currentUploadExecution;
	};
}

export const rcloneUploaderService = new RcloneUploaderService();
