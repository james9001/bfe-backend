import * as fs from "fs";
import { getApplicationConfig } from "../../misc/application-config.singleton";
import {
	uploadExecutionRepository,
	UploadStatus,
} from "../upload/repository/upload-execution.repository";
import {
	applicationStateRepository,
	ApplicationStateStatus,
} from "./repository/application-state.repository";
import {
	awaitingKillStateGlobal,
	ChildProcessCommand,
	childProcessEventEmitter,
	childProcessService,
} from "./service/child-process.service";
import { loggingService } from "./service/logging.service";
require("express-async-errors");

export class CommonMainService {
	public onApplicationStartRealignState = async () => {
		const globalState = await applicationStateRepository.get();

		//Turn off automatic mode
		globalState.inAutomaticMode = false;

		if (globalState._status == ApplicationStateStatus.DOING_BACKUP) {
			await this.flushTempDirectory();
			globalState._status = ApplicationStateStatus.FREE;
			globalState.currentBackupExecutionId = -1;
		} else if (globalState._status == ApplicationStateStatus.DOING_RESTORATION) {
			await this.flushTempDirectory();
			globalState._status = ApplicationStateStatus.FREE;
			globalState.currentRestorationExecutionId = -1;
		} else if (globalState._status == ApplicationStateStatus.DOING_UPLOAD) {
			if (globalState.currentUploadExecutionId > -1) {
				const currentUploadExecution = await uploadExecutionRepository.getById(
					globalState.currentUploadExecutionId
				);
				if (currentUploadExecution.status == UploadStatus.IN_PROGRESS) {
					currentUploadExecution.status = UploadStatus.PAUSED;
					await uploadExecutionRepository.update(currentUploadExecution);
					console.log(`UploadStatus is now ${currentUploadExecution.status}`);
				}
			}
		}
		await applicationStateRepository.update(globalState, false);
		console.log(`ApplicationStateStatus is now ${globalState._status}`);
	};

	public terminateGlobalAction = async () => {
		const globalState = await applicationStateRepository.get();
		if (globalState._status == ApplicationStateStatus.FREE) {
			throw new Error("Already doing nothing");
		} else if (globalState._status == ApplicationStateStatus.DOING_BACKUP) {
			await this.killCurrentProcess();
			await this.flushTempDirectory();
			globalState._status = ApplicationStateStatus.FREE;
			globalState.currentBackupExecutionId = -1;
			await applicationStateRepository.update(globalState, false);
			console.log(`ApplicationStateStatus is now ${globalState._status}`);
		} else if (globalState._status == ApplicationStateStatus.DOING_RESTORATION) {
			await this.killCurrentProcess();
			await this.flushTempDirectory();
			globalState._status = ApplicationStateStatus.FREE;
			globalState.currentRestorationExecutionId = -1;
			await applicationStateRepository.update(globalState, false);
			console.log(`ApplicationStateStatus is now ${globalState._status}`);
		} else if (globalState._status == ApplicationStateStatus.DOING_UPLOAD) {
			if (globalState.currentUploadExecutionId > -1) {
				throw new Error("Can't do. Use the Current Upload action buttons first.");
			} else {
				await this.flushTempDirectory();
				globalState._status = ApplicationStateStatus.FREE;
				globalState.currentBackupExecutionId = -1;
				await applicationStateRepository.update(globalState, false);
				console.log(`ApplicationStateStatus is now ${globalState._status}`);
			}
		}
	};

	public killCurrentProcess = async () => {
		await loggingService.logAndPrint(
			"Killing current process by means of using ChildProcessService KillCurrentProcess event"
		);
		awaitingKillStateGlobal.isAwaitingKill = true;
		childProcessEventEmitter.emit("KillCurrentProcess");
		await new Promise<void>((resolve) => {
			const checker = async () => {
				if (awaitingKillStateGlobal.isAwaitingKill) {
					if (!awaitingKillStateGlobal.probablyStuck) {
						await loggingService.logAndPrint("Still waiting for KillCurrentProcess...");
					}
					setTimeout(checker, 5000);
				} else {
					resolve();
				}
			};
			const timeout = async () => {
				if (awaitingKillStateGlobal.isAwaitingKill) {
					await loggingService.logAndPrint(
						"killCurrentProcess timeout: We're probably stuck. Time to raise the error flag."
					);
					awaitingKillStateGlobal.mostRecentKillOutcome = "wait timed out, probably stuck";
					awaitingKillStateGlobal.probablyStuck = true;
					await applicationStateRepository.markAsErrorState();
				}
			};
			setTimeout(timeout, 300000);
			setTimeout(checker, 5000);
		});
		await loggingService.logAndPrint("KillCurrentProcess is finished.");
	};

	private flushTempDirectory = async () => {
		await loggingService.logAndPrint("Flushing entire temp directory.");
		const filesInTempDir: string[] = fs.readdirSync(getApplicationConfig().appTmp);
		for (const file of filesInTempDir) {
			const removeBackupWorkingDirCommand: ChildProcessCommand = {
				executable: "rm",
				argumentz: ["-rf", file],
			};
			await childProcessService.executeChildProcess(removeBackupWorkingDirCommand);
		}
		await loggingService.logAndPrint("Flushed temp directory.");
	};
}

export const commonMainService = new CommonMainService();
