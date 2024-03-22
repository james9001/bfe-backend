import * as fs from "fs";
import { getApplicationConfig } from "../../../misc/application-config.singleton";
import { loggingService } from "../../common/service/logging.service";
import { BackupExecution } from "../repository/backup-execution.repository";

export class ValidationService {
	public doAllValidations = async (
		exec: BackupExecution,
		piecesCodeClaimsExists: string[]
	): Promise<void> => {
		await this.validateOnlyOneThingExistsInTmpAndItIsTheArtefactDir(exec);

		await this.validateActualPiecesMatchExpected(exec, piecesCodeClaimsExists);

		await loggingService.logAndPrint("Finished validating pieces - all good.");
	};

	private validateOnlyOneThingExistsInTmpAndItIsTheArtefactDir = async (
		exec: BackupExecution
	): Promise<void> => {
		//This should be an array of one.
		const filesInAppTmp: string[] = fs.readdirSync(getApplicationConfig().appTmp);
		if (filesInAppTmp.length > 1) {
			throw new Error(
				"Validation failed: Expected one and only one entity in the extracted archive app tmp place"
			);
		}
		const fileInAppTmp = filesInAppTmp[0];

		if (!fs.statSync(getApplicationConfig().appTmp + "/" + fileInAppTmp).isDirectory()) {
			throw new Error("Validation failed: Expected the one thing in app tmp to be a directory");
		}

		const artefactDir = "dir_" + exec.artefactName;
		if (fileInAppTmp !== artefactDir) {
			throw new Error(
				"Validation failed: Expected the one thing in app tmp to be named dir_artefactName etc"
			);
		}
	};

	private validateActualPiecesMatchExpected = async (
		exec: BackupExecution,
		piecesCodeClaimsExists: string[]
	): Promise<void> => {
		const artefactDir = "dir_" + exec.artefactName;
		const actualPieces = await this.getActualPiecesThatExist(artefactDir);

		for (const pieceCodeClaimsExists of piecesCodeClaimsExists) {
			let doesPieceExist = false;
			for (const actualPiece of actualPieces) {
				if (actualPiece === pieceCodeClaimsExists) {
					doesPieceExist = true;
				}
			}
			if (!doesPieceExist) {
				throw new Error(
					"Validation failed: There is a piece expected to exist which does not: " +
						pieceCodeClaimsExists
				);
			}
		}

		for (const actualPiece of actualPieces) {
			let shouldPieceExist = false;
			for (const claimedPiece of piecesCodeClaimsExists) {
				if (claimedPiece === actualPiece) {
					shouldPieceExist = true;
				}
			}
			if (!shouldPieceExist) {
				throw new Error("Validation failed: A piece exists which should not: " + actualPiece);
			}
		}
	};

	private getActualPiecesThatExist = async (artefactDir: string): Promise<string[]> => {
		const fsPrefix = getApplicationConfig().appTmp + "/";
		const filesInContainingDir: string[] = fs.readdirSync(fsPrefix + artefactDir);

		const expectedFiles: string[] = [];

		for (const fileInContainingDir of filesInContainingDir) {
			const fileInContainingDirArtefactDirPath = artefactDir + "/" + fileInContainingDir;

			if (fs.statSync(fsPrefix + fileInContainingDirArtefactDirPath).isDirectory()) {
				const subdirectoryFiles = fs.readdirSync(fsPrefix + fileInContainingDirArtefactDirPath);

				for (const subdirectoryFile of subdirectoryFiles) {
					if (
						fs
							.statSync(fsPrefix + fileInContainingDirArtefactDirPath + "/" + subdirectoryFile)
							.isDirectory()
					) {
						throw new Error("Unexpected directory!");
					} else {
						expectedFiles.push(fileInContainingDirArtefactDirPath + "/" + subdirectoryFile);
					}
				}
			} else {
				expectedFiles.push(fileInContainingDirArtefactDirPath);
			}
		}
		return expectedFiles;
	};
}

export const validationService = new ValidationService();
