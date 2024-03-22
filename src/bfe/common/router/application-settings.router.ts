import express, { Request, Response } from "express";
import { automaticModeMainService } from "../../automaticmode/automaticmode.main.service";
import {
	UploadExecution,
	uploadExecutionRepository,
	UploadStatus,
} from "../../upload/repository/upload-execution.repository";
import { rcloneUploaderService } from "../../upload/service/rclone-uploader.service";
import { commonMainService } from "../common.main.service";
import { applicationSettingsRepository } from "../repository/application-settings.repository";
import {
	applicationStateRepository,
	ApplicationStateStatus,
} from "../repository/application-state.repository";

require("express-async-errors");

export const applicationSettingsRouter = express.Router();

applicationSettingsRouter.get("/settings", async (req: Request, resp: Response) => {
	const settings = await applicationSettingsRepository.get();

	resp.status(200).send(settings);
});

applicationSettingsRouter.put("/settings", async (req: Request, resp: Response) => {
	const settings = await applicationSettingsRepository.get();

	settings.rcloneBwLimit = req.body.rcloneBwLimit;
	settings.defaultUploadDestination = req.body.defaultUploadDestination;
	settings.defaultUploadPath = req.body.defaultUploadPath;
	settings.defaultBackupCategory = req.body.defaultBackupCategory;
	settings.defaultSecondUploadDestination = req.body.defaultSecondUploadDestination;
	settings.defaultSecondUploadPath = req.body.defaultSecondUploadPath;
	settings.showOldDataPages = req.body.showOldDataPages;
	settings.uploadToTwoTargets = req.body.uploadToTwoTargets;
	settings.backupCopyPhaseBwLimit = req.body.backupCopyPhaseBwLimit;

	await applicationSettingsRepository.update(settings);

	resp.status(200).send();
});

applicationSettingsRouter.post("/speedsetting", async (req: Request, resp: Response) => {
	const globalState = await applicationStateRepository.get();
	if (
		globalState._status != ApplicationStateStatus.DOING_UPLOAD ||
		globalState.currentUploadExecutionId == -1
	) {
		throw new Error("Invalid state transition");
	}
	const currentUploadExecution = await getCurrentUploadExecution();
	if (currentUploadExecution.status != UploadStatus.IN_PROGRESS) {
		throw new Error("Invalid state transition");
	}

	void handleSpeedSetting(req.body.rcloneBwLimit);

	resp.status(200).send("Speed setting change command issued.");
});

applicationSettingsRouter.get("/speedsettingstate", async (req: Request, resp: Response) => {
	resp.status(200).send(speedSettingState);
});

const handleSpeedSetting = async (newRcloneBwLimit: string): Promise<void> => {
	try {
		// Set flag so the auto mode doesn't take actions
		automaticModeMainService.doingSomething = true;

		// do the “Kill Process” thing. Wait for it.
		speedSettingState = "I: Killing current process...";
		await commonMainService.killCurrentProcess();

		// change the rclone bwlimit. persist the change to db.
		speedSettingState = "I: Setting new speed value of " + newRcloneBwLimit;
		const settings = await applicationSettingsRepository.get();
		settings.rcloneBwLimit = newRcloneBwLimit;
		await applicationSettingsRepository.update(settings);

		// Resume the rclone upload.
		speedSettingState = "S: Kicking off new upload at speed of: " + newRcloneBwLimit;
		void rcloneUploaderService.onResumeUpload();

		// Remove the auto mode freeze flag
		automaticModeMainService.doingSomething = false;

		setTimeout(() => {
			speedSettingState = "";
		}, 5000);
	} catch (err: any) {
		speedSettingState = "D: Something bad has occurred";
	}
};

const getCurrentUploadExecution = async (): Promise<UploadExecution> => {
	const globalState = await applicationStateRepository.get();
	const currentUploadExecution = await uploadExecutionRepository.getById(
		globalState.currentUploadExecutionId
	);
	return currentUploadExecution;
};

let speedSettingState = "";
