import { getApplicationConfig } from "../../misc/application-config.singleton";
import {
	applicationStateRepository,
	ApplicationStateStatus,
} from "../common/repository/application-state.repository";
import { checksumService } from "../common/service/checksum.service";
import {
	awaitingKillStateGlobal,
	childProcessEventEmitter,
} from "../common/service/child-process.service";
import { loggingService } from "../common/service/logging.service";
import { massRenamingService } from "../common/service/mass-renaming.service";
import {
	RestorationExecution,
	restorationExecutionRepository,
} from "./repository/restoration-execution.repository";
import {
	EncryptionType,
	RestorationSecret,
	restorationSecretRepository,
} from "./repository/restoration-secret.repository";
import { decryptionService } from "./service/decryption.service";
import { restorationTargetCopyingService } from "./service/restoration-target-copying.service";
import { splitRecombinationService } from "./service/split-recombination.service";
import { tarExtractionService } from "./service/tar-extraction.service";
import { ungzipService } from "./service/ungzip.service";

export class RestorationMainService {
	public runRestoration = async (
		aesPassword: string,
		camelliaPassword: string,
		category: string,
		checksum: string,
		sourceDir: string,
		destinationDir: string
	): Promise<void> => {
		//Phase 0 - Preparation
		const exec = await this.setupAndGetNewRestorationBfeExecution(
			aesPassword,
			camelliaPassword,
			category,
			checksum,
			sourceDir,
			destinationDir
		);

		const globalState = await applicationStateRepository.get();
		globalState._status = ApplicationStateStatus.DOING_RESTORATION;
		globalState.currentRestorationExecutionId = exec.id;
		await applicationStateRepository.update(globalState);
		console.log(`ApplicationStateStatus is now ${globalState._status}`);

		try {
			//Phase 1 - Copy encrypted stuff to temp
			await restorationTargetCopyingService.copyBackupForRestoringIntoTemp(exec);

			//Phase 2 - Rename to ".gz.gpg.gpg"
			const renamedPieces = await massRenamingService.changeAllPiecesNamesToHaveProvidedFileExtensions(
				[".gz", ".gpg", ".gpg"],
				getApplicationConfig().appTmp + "/" + exec.backupDirName
			);

			//Phase 3 - Decryptions
			const camelliaDecryptedPieces = await decryptionService.decryptAllPieces(
				exec,
				renamedPieces,
				false
			);
			const fullyDecryptedPieces = await decryptionService.decryptAllPieces(
				exec,
				camelliaDecryptedPieces,
				true
			);

			//Phase 4 - Ungzip
			await ungzipService.ungzipAllPieces(fullyDecryptedPieces);

			//Phase 5 - Combine hard splits
			await splitRecombinationService.recombineAllSplitSubarchives(exec);

			//Phase 6 - Extract tar(s)  (TarCreationService)
			await tarExtractionService.extractAllTarArchivesInDirectory(exec);

			//Phase 7 - Check against checksum
			await checksumService.compareRestoredChecksumWithStatedChecksum(exec);

			//Phase 8 - Move to destination place
			await restorationTargetCopyingService.moveRestoredBackupToDestinationDir(exec);

			//Phase 9 - Write records
			//await recordWritingService.writeRecordsForRestoration(exec);

			//For uniformity, handle this the same way as Backup.
			await this.finishUpRestorationProcess();

			//Clean up child process event emitter
			childProcessEventEmitter.removeAllListeners("KillCurrentProcess");
		} catch (err: any) {
			childProcessEventEmitter.removeAllListeners("KillCurrentProcess");
			if (awaitingKillStateGlobal.isAwaitingKill) {
				awaitingKillStateGlobal.isAwaitingKill = false;
				awaitingKillStateGlobal.mostRecentKillOutcome = "nice and tidy";
				await loggingService.logAndPrint(
					"Caught error in the RestorationMainService runBackup async process. It seems to have been intentional."
				);
			} else {
				await applicationStateRepository.markAsErrorState();
				await loggingService.logAndPrint(
					"Caught unexpected error in the RestorationMainService runBackup async process!"
				);
			}
			await loggingService.logAndPrint(err);
		}
	};

	private finishUpRestorationProcess = async () => {
		//Set global state back to FREE and remove the restoration execution ID.
		const globalStateAfterwards = await applicationStateRepository.get();
		globalStateAfterwards._status = ApplicationStateStatus.FREE;
		globalStateAfterwards.currentRestorationExecutionId = -1;
		await applicationStateRepository.update(globalStateAfterwards);
		console.log(`ApplicationStateStatus is now ${globalStateAfterwards._status}`);
	};

	public setupAndGetNewRestorationBfeExecution = async (
		aesPassword: string,
		camelliaPassword: string,
		category: string,
		checksum: string,
		sourceDir: string,
		destinationDir: string
	): Promise<RestorationExecution> => {
		const newExec = new RestorationExecution();
		newExec.sourceDir = sourceDir;
		newExec.destinationDir = destinationDir;
		newExec.category = category;
		newExec.checksum = {
			checksumValue: checksum,
		};
		const exec = await restorationExecutionRepository.create(newExec);

		const newAesSecretModel = new RestorationSecret();
		newAesSecretModel.restorationExecutionId = exec.id;
		newAesSecretModel.encryptionType = EncryptionType.AES256;
		newAesSecretModel.orderNumber = 0;
		newAesSecretModel.secretValue = aesPassword;
		await restorationSecretRepository.create(newAesSecretModel);

		const newCamelliaSecretModel = new RestorationSecret();
		newCamelliaSecretModel.restorationExecutionId = exec.id;
		newCamelliaSecretModel.encryptionType = EncryptionType.CAMELLIA256;
		newCamelliaSecretModel.orderNumber = 1;
		newCamelliaSecretModel.secretValue = camelliaPassword;
		await restorationSecretRepository.create(newCamelliaSecretModel);

		return exec;
	};
}

export const restorationMainService = new RestorationMainService();
