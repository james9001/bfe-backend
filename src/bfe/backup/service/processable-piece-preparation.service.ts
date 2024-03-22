import * as fs from "fs";
import { getApplicationConfig } from "../../../misc/application-config.singleton";
import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import { BackupExecution } from "../repository/backup-execution.repository";

export class ProcessablePiecePreparationService {
	public processSubarchivesIntoProcessablePieces = async (
		exec: BackupExecution
	): Promise<string[]> => {
		const subarchives: string[] = fs.readdirSync(
			getApplicationConfig().appTmp + "/dir_" + exec.artefactName
		);
		let subarchiveNum = 0;

		await loggingService.logAndPrint("Preparing enumerated list of processable pieces...");
		let enumeratedListOfProcessablePieces: string[] = [];
		for (const subarchiveFilename of subarchives) {
			enumeratedListOfProcessablePieces = [
				...enumeratedListOfProcessablePieces,
				...(await this.processSubarchive(subarchiveFilename, subarchiveNum, exec)),
			];
			subarchiveNum++;
		}
		await loggingService.logAndPrint("Finished preparing enumerated list of processable pieces.");
		return enumeratedListOfProcessablePieces;
	};

	private processSubarchive = async (
		subarchiveFilename: string,
		subarchiveNum: number,
		exec: BackupExecution
	): Promise<string[]> => {
		const subarchiveExecution: SubarchiveExecution = {
			artefactDir: "dir_" + exec.artefactName,
			finalName: exec.artefactName + "_" + subarchiveNum,
			subarchiveRelativePath: "dir_" + exec.artefactName + "/" + subarchiveFilename,
		};

		await loggingService.logAndPrint("Checking size of this subarchive...");
		const bytesSize = fs.statSync(
			getApplicationConfig().appTmp + "/" + subarchiveExecution.subarchiveRelativePath
		).size;
		await loggingService.logAndPrint(
			"" + subarchiveExecution.subarchiveRelativePath + " is " + bytesSize + " bytes"
		);

		if (bytesSize > getApplicationConfig().maxSubarchiveSizeBytes) {
			await loggingService.logAndPrint(
				"This subarchive is over the max subarchive size bytes, splitting this the hard way"
			);
			return await this.processBigSubarchive(subarchiveFilename, subarchiveExecution);
		} else {
			await loggingService.logAndPrint("Under 1GB, processing as normal piece");
			const lonelyArray: string[] = [];
			lonelyArray.push(await this.processPiece(subarchiveExecution));
			return lonelyArray;
		}
	};

	private processBigSubarchive = async (
		filenameOfTooLargeSubarchive: string,
		subarchiveExecution: SubarchiveExecution
	): Promise<string[]> => {
		const bigArchivePreSplitName =
			subarchiveExecution.artefactDir + "/" + subarchiveExecution.finalName;

		await (async () => {
			// #Rename the main one first
			const mvCommand: ChildProcessCommand = {
				executable: "mv",
				argumentz: [
					subarchiveExecution.artefactDir + "/" + filenameOfTooLargeSubarchive,
					bigArchivePreSplitName,
				],
			};
			await childProcessService.executeChildProcess(mvCommand);
		})();

		const splitsDir = subarchiveExecution.artefactDir + "/dir_" + subarchiveExecution.finalName;

		await (async () => {
			// #Make directory for the subarchive pieces
			const subarchiveMkdirCommand: ChildProcessCommand = {
				executable: "mkdir",
				argumentz: [splitsDir],
			};
			await childProcessService.executeChildProcess(subarchiveMkdirCommand);
		})();

		await (async () => {
			// #Split this the hard way
			const splitCommand: ChildProcessCommand = {
				executable: "split",
				argumentz: [
					"-b",
					"100m",
					bigArchivePreSplitName,
					splitsDir + "/" + subarchiveExecution.finalName + "_",
				],
			};
			await childProcessService.executeChildProcess(splitCommand);
		})();

		await (async () => {
			// #delete the original subarchive
			const originalDeleteCommand: ChildProcessCommand = {
				executable: "rm",
				argumentz: [bigArchivePreSplitName],
			};
			await childProcessService.executeChildProcess(originalDeleteCommand);
		})();

		const newPieceNewNames: string[] = [];
		await (async () => {
			// #Process pieces
			const pieces = fs.readdirSync(getApplicationConfig().appTmp + "/" + splitsDir);
			let pieceNum = 0;

			for (const piece of pieces) {
				const subSubArchiveExecution: SubarchiveExecution = {
					artefactDir: splitsDir,
					finalName: subarchiveExecution.finalName + "_" + pieceNum,
					subarchiveRelativePath: splitsDir + "/" + piece,
				};

				newPieceNewNames.push(await this.processPiece(subSubArchiveExecution));
				pieceNum++;
			}
		})();
		return newPieceNewNames;
	};

	private processPiece = async (subarchiveExecution: SubarchiveExecution): Promise<string> => {
		const pieceNewName = subarchiveExecution.artefactDir + "/" + subarchiveExecution.finalName;
		await (async () => {
			// #Rename it into final form
			const command6: ChildProcessCommand = {
				executable: "mv",
				argumentz: [subarchiveExecution.subarchiveRelativePath, pieceNewName],
			};
			await childProcessService.executeChildProcess(command6);
		})();
		return pieceNewName;
	};
}

export const processablePiecePreparationService = new ProcessablePiecePreparationService();

interface SubarchiveExecution {
	readonly artefactDir: string;
	readonly finalName: string;
	readonly subarchiveRelativePath: string;
}
