import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import { BackupExecution } from "../repository/backup-execution.repository";
import { BackupSecret } from "../repository/backup-secret.repository";

export class EncryptionService {
	public encryptAllPieces = async (
		exec: BackupExecution,
		processablePieces: string[],
		isAes: boolean
	): Promise<string[]> => {
		const secrets = await exec.getBackupSecrets();
		const aesPassword = (
			secrets.find((secret) => {
				return secret.orderNumber === 0;
			}) as BackupSecret
		).secretValue;
		const camelliaPassword = (
			secrets.find((secret) => {
				return secret.orderNumber === 1;
			}) as BackupSecret
		).secretValue;
		await loggingService.logAndPrint("Starting encryptions...");
		const processedPieces: string[] = [];
		for (const processablePiece of processablePieces) {
			if (isAes) {
				processedPieces.push(await this.runAesEncryption(processablePiece, aesPassword));
			} else {
				processedPieces.push(await this.runCamelliaEncryption(processablePiece, camelliaPassword));
			}

			await (async () => {
				// #Delete original piece to save space
				const deleteCommand: ChildProcessCommand = {
					executable: "rm",
					argumentz: [processablePiece],
				};
				await childProcessService.executeChildProcess(deleteCommand);
			})();
		}
		await loggingService.logAndPrint("Finished encryptions.");
		return processedPieces;
	};

	private runAesEncryption = async (processablePiece: string, password: string): Promise<string> => {
		const aesEncryptionCommand: ChildProcessCommand = {
			executable: "gpg",
			argumentz: [
				"--batch",
				"-c",
				"--cipher-algo",
				"AES256",
				"--passphrase",
				password,
				processablePiece,
			],
		};
		await childProcessService.executeChildProcess(aesEncryptionCommand);

		//gpg seems to append a .gpg extension to files when it encrypts them
		return processablePiece + ".gpg";
	};

	private runCamelliaEncryption = async (
		processablePiece: string,
		password: string
	): Promise<string> => {
		const camelliaEncryptionCommand: ChildProcessCommand = {
			executable: "gpg",
			argumentz: [
				"--batch",
				"-c",
				"--cipher-algo",
				"CAMELLIA256",
				"--passphrase",
				password,
				processablePiece,
			],
		};
		await childProcessService.executeChildProcess(camelliaEncryptionCommand);

		//gpg seems to append a .gpg extension to files when it encrypts them
		return processablePiece + ".gpg";
	};
}

export const encryptionService = new EncryptionService();
