import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import { RestorationExecution } from "../repository/restoration-execution.repository";
import { RestorationSecret } from "../repository/restoration-secret.repository";

export class DecryptionService {
	public decryptAllPieces = async (
		exec: RestorationExecution,
		processablePieces: string[],
		isAes: boolean
	): Promise<string[]> => {
		const secrets = await exec.getRestorationSecrets();
		const aesPassword = (
			secrets.find((secret) => {
				return secret.orderNumber === 0;
			}) as RestorationSecret
		).secretValue;
		const camelliaPassword = (
			secrets.find((secret) => {
				return secret.orderNumber === 1;
			}) as RestorationSecret
		).secretValue;
		await loggingService.logAndPrint("Starting decryptions...");
		const processedPieces: string[] = [];
		for (const processablePiece of processablePieces) {
			if (isAes) {
				processedPieces.push(await this.runAesDecryption(processablePiece, aesPassword));
			} else {
				processedPieces.push(await this.runCamelliaDecryption(processablePiece, camelliaPassword));
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
		await loggingService.logAndPrint("Finished decryptions.");
		return processedPieces;
	};

	//Returns processablePiece with last 4 characters chopped off (i.e. the last ".gpg" extension)
	private runAesDecryption = async (processablePiece: string, password: string): Promise<string> => {
		const outputFileName = processablePiece.substring(0, processablePiece.length - 4);
		const aesEncryptionCommand: ChildProcessCommand = {
			executable: "gpg",
			argumentz: [
				"--batch",
				"-d",
				"--cipher-algo",
				"AES256",
				"--passphrase",
				password,
				"-o",
				outputFileName,
				processablePiece,
			],
		};
		await childProcessService.executeChildProcess(aesEncryptionCommand);
		return outputFileName;
	};

	//Returns processablePiece with last 4 characters chopped off (i.e. the last ".gpg" extension)
	private runCamelliaDecryption = async (
		processablePiece: string,
		password: string
	): Promise<string> => {
		const outputFileName = processablePiece.substring(0, processablePiece.length - 4);
		const camelliaEncryptionCommand: ChildProcessCommand = {
			executable: "gpg",
			argumentz: [
				"--batch",
				"-d",
				"--cipher-algo",
				"CAMELLIA256",
				"--passphrase",
				password,
				"-o",
				outputFileName,
				processablePiece,
			],
		};
		await childProcessService.executeChildProcess(camelliaEncryptionCommand);
		return outputFileName;
	};
}

export const decryptionService = new DecryptionService();
