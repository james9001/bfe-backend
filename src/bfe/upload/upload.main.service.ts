import {
	applicationStateRepository,
	ApplicationStateStatus,
} from "../common/repository/application-state.repository";
import {
	UploadExecution,
	uploadExecutionRepository,
	UploadStatus,
} from "./repository/upload-execution.repository";
import { AbstractUploaderService } from "./service/abstract-uploader.service";
import { copypastaUploaderService } from "./service/copypasta-uploader.service";
import { rcloneUploaderService } from "./service/rclone-uploader.service";

export class UploadMainService {
	public createNewActiveUploadExecution = async (
		destination: string,
		destinationPath: string
	): Promise<void> => {
		const globalState = await applicationStateRepository.get();
		if (globalState.currentUploadExecutionId > -1) {
			throw new Error("There is already an active current upload execution");
		}
		if (globalState._status != ApplicationStateStatus.DOING_UPLOAD) {
			throw new Error("Not doing upload currently");
		}
		const newItem = new UploadExecution();
		newItem.backupExecutionId = (await applicationStateRepository.get()).currentBackupExecutionId;
		newItem.status = UploadStatus.NOT_STARTED;
		newItem.destination = destination;
		newItem.destinationPath = destinationPath;
		const savedItem = await uploadExecutionRepository.create(newItem);
		globalState.currentUploadExecutionId = savedItem.id;
		await applicationStateRepository.update(globalState, false);
		console.log(`UploadStatus is now ${newItem.status} (newly created and assigned)`);
	};

	private getCurrentUploadExecution = async (): Promise<UploadExecution> => {
		const globalState = await applicationStateRepository.get();
		const currentUploadExecution = await uploadExecutionRepository.getById(
			globalState.currentUploadExecutionId
		);
		return currentUploadExecution;
	};

	public startCurrentUploadExecution = async () => {
		const currentUploadExecution = await this.getCurrentUploadExecution();
		if (currentUploadExecution.status == UploadStatus.NOT_STARTED) {
			void this.getUploaderService(currentUploadExecution).onStartUpload();
			currentUploadExecution.status = UploadStatus.IN_PROGRESS;
			await uploadExecutionRepository.update(currentUploadExecution);
			console.log(`UploadStatus is now ${currentUploadExecution.status}`);
		} else {
			throw new Error("Invalid state transition");
		}
	};

	public pauseCurrentUploadExecution = async () => {
		const currentUploadExecution = await this.getCurrentUploadExecution();
		if (currentUploadExecution.status == UploadStatus.IN_PROGRESS) {
			void this.getUploaderService(currentUploadExecution).onPauseUpload();
			currentUploadExecution.status = UploadStatus.PAUSED;
			await uploadExecutionRepository.update(currentUploadExecution);
			console.log(`UploadStatus is now ${currentUploadExecution.status}`);
		} else {
			throw new Error("Invalid state transition");
		}
	};

	public resumeCurrentUploadExecution = async () => {
		const currentUploadExecution = await this.getCurrentUploadExecution();
		if (currentUploadExecution.status == UploadStatus.PAUSED) {
			void this.getUploaderService(currentUploadExecution).onResumeUpload();
			currentUploadExecution.status = UploadStatus.IN_PROGRESS;
			await uploadExecutionRepository.update(currentUploadExecution);
			console.log(`UploadStatus is now ${currentUploadExecution.status}`);
		} else {
			throw new Error("Invalid state transition");
		}
	};

	public removeCurrentUploadExecution = async () => {
		const currentUploadExecution = await this.getCurrentUploadExecution();
		if (
			currentUploadExecution.status == UploadStatus.NOT_STARTED ||
			currentUploadExecution.status == UploadStatus.PAUSED
		) {
			void this.getUploaderService(currentUploadExecution).onRemoveUpload();
			currentUploadExecution.status = UploadStatus.REMOVED;
			await uploadExecutionRepository.update(currentUploadExecution);
			console.log(
				`UploadStatus is now ${currentUploadExecution.status} (and exec will soon be removed)`
			);
			const globalState = await applicationStateRepository.get();
			globalState.currentUploadExecutionId = -1;
			await applicationStateRepository.update(globalState, false);
		} else {
			throw new Error("Invalid state transition");
		}
	};

	public finaliseCurrentUploadExecution = async () => {
		const currentUploadExecution = await this.getCurrentUploadExecution();
		if (currentUploadExecution.status == UploadStatus.COMPLETE) {
			void this.getUploaderService(currentUploadExecution).onFinaliseUpload();
			const globalState = await applicationStateRepository.get();
			globalState.currentUploadExecutionId = -1;
			await applicationStateRepository.update(globalState, false);
		} else {
			throw new Error("Invalid state transition");
		}
	};

	private getUploaderService(exec: UploadExecution): AbstractUploaderService {
		if (exec.destination === "rclone") {
			return rcloneUploaderService;
		}
		if (exec.destination === "copypasta") {
			return copypastaUploaderService;
		}
		throw new Error("There is no uploader for " + exec.destination);
	}
}

export const uploadMainService = new UploadMainService();
