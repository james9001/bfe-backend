import * as fs from "fs";
import fastFolderSizeSync from "fast-folder-size/sync";
import { getApplicationConfig } from "../../misc/application-config.singleton";
import {
	applicationStateRepository,
	ApplicationStateStatus,
} from "../common/repository/application-state.repository";
import { checksumService } from "../common/service/checksum.service";
import {
	awaitingKillStateGlobal,
	ChildProcessCommand,
	childProcessEventEmitter,
	childProcessService,
} from "../common/service/child-process.service";
import { loggingService } from "../common/service/logging.service";
import { massRenamingService } from "../common/service/mass-renaming.service";
import { timeService } from "../common/service/time.service";
import {
	BackupExecution,
	backupExecutionRepository,
} from "./repository/backup-execution.repository";
import {
	BackupSecret,
	backupSecretRepository,
	EncryptionType,
} from "./repository/backup-secret.repository";
import { backupTargetCopyingService } from "./service/backup-target-copying.service";
import { encryptionService } from "./service/encryption.service";
import { gzipService } from "./service/gzip.service";
import { processablePiecePreparationService } from "./service/processable-piece-preparation.service";
import { subarchiveCreationService } from "./service/subarchive-creation.service";
import { tarCreationService } from "./service/tar-creation.service";
import { validationService } from "./service/validation.service";

export class BackupMainService {
	public runBackup = async (exec: BackupExecution): Promise<void> => {
		const globalState = await applicationStateRepository.get();
		globalState._status = ApplicationStateStatus.DOING_BACKUP;
		globalState.currentBackupExecutionId = exec.id;
		await applicationStateRepository.update(globalState);
		console.log(`ApplicationStateStatus is now ${globalState._status}`);

		try {
			await this.validatePreservationTargetIsNotLiterallyCompletelyEmpty(exec);

			//Phase 1 - Copy backup target to temp
			await backupTargetCopyingService.copyPreservationTargetToTemp(exec);

			//Write pre-backup process size to the DB
			exec.beforeProcessBytes =
				"" +
				(await this.getDirectorySize(
					getApplicationConfig().appTmp + "/" + (await exec.getPreservationTarget()).directoryName
				));
			await backupExecutionRepository.update(exec);

			//Phase 2 - Calculate checksum
			await checksumService.getChecksumForBackupExecution(exec);

			//Phase 3 - Create tar
			await tarCreationService.createTarFromBackupTarget(exec);

			//Phase 4 - Tarsplitter: divide archive into subarchives along file lines. If possible.
			await subarchiveCreationService.splitOriginalTarIntoSubarchives(exec);

			//Phase 5 - Prepare and enumerate processable pieces, including splitting any subarchives
			// that are still too large
			const processablePieces =
				await processablePiecePreparationService.processSubarchivesIntoProcessablePieces(exec);

			//Phase 6 - Gzip
			const gzippedPieces = await gzipService.gzipAllPieces(processablePieces);

			//Phase 7 - Encryption(s)
			const aesEncryptedPieces = await encryptionService.encryptAllPieces(exec, gzippedPieces, true);
			const camelliaEncryptedPieces = await encryptionService.encryptAllPieces(
				exec,
				aesEncryptedPieces,
				false
			);

			//Phase 8 - Extra security validation
			await validationService.doAllValidations(exec, camelliaEncryptedPieces);

			//Phase 9 - Final Rename. Removes any "file extensions" added during processing.
			await massRenamingService.changeAllPiecesNamesToHaveProvidedFileExtensions(
				[],
				getApplicationConfig().appTmp + "/dir_" + exec.artefactName
			);

			//Write post-backup process size to the DB
			exec.afterProcessBytes =
				"" + (await this.getDirectorySize(getApplicationConfig().appTmp + "/dir_" + exec.artefactName));
			await backupExecutionRepository.update(exec);

			//Phase 10 - Write records
			//await recordWritingService.writeRecordsForBackup(exec);
			await loggingService.logAndPrint("Backup phase is finished. Moving into Upload phase.");

			//Transition into upload phase
			await this.transitionIntoUploadPhase();

			//Clean up child process event emitter
			childProcessEventEmitter.removeAllListeners("KillCurrentProcess");
		} catch (err: any) {
			childProcessEventEmitter.removeAllListeners("KillCurrentProcess");
			if (awaitingKillStateGlobal.isAwaitingKill) {
				awaitingKillStateGlobal.isAwaitingKill = false;
				awaitingKillStateGlobal.mostRecentKillOutcome = "nice and tidy";
				await loggingService.logAndPrint(
					"Caught error in the BackupMainService runBackup async process. It seems to have been intentional."
				);
			} else {
				await applicationStateRepository.markAsErrorState();
				await loggingService.logAndPrint(
					"Caught unexpected error in the BackupMainService runBackup async process!"
				);
			}
			await loggingService.logAndPrint(err);
		}
	};

	private transitionIntoUploadPhase = async (): Promise<void> => {
		const globalState = await applicationStateRepository.get();
		if (globalState._status != ApplicationStateStatus.DOING_BACKUP) {
			throw new Error(
				"Whilst invoking transitionIntoUploadFromBackup automatically, we expected to be in Doing Backup status, but we are not!"
			);
		}
		globalState._status = ApplicationStateStatus.DOING_UPLOAD;
		await applicationStateRepository.update(globalState, false);
		console.log(`ApplicationStateStatus is now ${globalState._status}`);
	};

	private getDirectorySize = async (directoryFullPath: string): Promise<number> => {
		return fastFolderSizeSync(directoryFullPath) as number;
	};

	public setupAndGetNewBackupBfeExecution = async (
		preservationTargetId: number,
		backupCategory: string
	): Promise<BackupExecution> => {
		const newExec = new BackupExecution();
		newExec.preservationTargetId = preservationTargetId;
		newExec.category = backupCategory;
		newExec.artefactName = await this.generateArtefactName();
		const exec = await backupExecutionRepository.create(newExec);

		await loggingService.logAndPrint(
			"STARTING BACKUP OF " +
				(
					await exec.getPreservationTarget()
				).directoryName +
				" IN CATEGORY " +
				exec.category
		);

		const newAesSecretModel = new BackupSecret();
		newAesSecretModel.backupExecutionId = exec.id;
		newAesSecretModel.encryptionType = EncryptionType.AES256;
		newAesSecretModel.orderNumber = 0;
		newAesSecretModel.secretValue = await this.generatePassword();
		await backupSecretRepository.create(newAesSecretModel);

		const newCamelliaSecretModel = new BackupSecret();
		newCamelliaSecretModel.backupExecutionId = exec.id;
		newCamelliaSecretModel.encryptionType = EncryptionType.CAMELLIA256;
		newCamelliaSecretModel.orderNumber = 1;
		newCamelliaSecretModel.secretValue = await this.generatePassword();
		await backupSecretRepository.create(newCamelliaSecretModel);

		return exec;
	};

	private generateArtefactName = async (): Promise<string> => {
		const command: ChildProcessCommand = {
			executable: "gpg",
			argumentz: ["--batch", "--gen-random", "--armor", "1", "16"],
		};
		const randomText = await childProcessService.executeChildProcess(command);
		const artefactName = randomText.replace(/[^A-Za-z]/g, "0");
		await loggingService.logAndPrint("Generated random label " + artefactName);
		return artefactName;
	};

	private generatePassword = async (): Promise<string> => {
		const command: ChildProcessCommand = {
			executable: "gpg",
			argumentz: ["--batch", "--gen-random", "--armor", "1", "100"],
		};
		const timestamp = await timeService.getTimestamp();
		const password = (await childProcessService.executeChildProcess(command)) + timestamp;
		return password;
	};

	private validatePreservationTargetIsNotLiterallyCompletelyEmpty = async (
		backupRequest: BackupExecution
	): Promise<void> => {
		const preservationTarget = await backupRequest.getPreservationTarget();
		const filesInPreservationTarget: string[] = fs.readdirSync(preservationTarget.fullPath);
		console.log(
			`Preservation Target ${preservationTarget.id} (${preservationTarget.name}) at path ${preservationTarget.fullPath} has ${filesInPreservationTarget.length} files/folders in it`
		);
		if (filesInPreservationTarget.length === 0) {
			throw new Error(
				`Preservation Target ${preservationTarget.id} (${preservationTarget.name}) at path ${preservationTarget.fullPath} is empty.`
			);
		}
	};
}

export const backupMainService = new BackupMainService();
