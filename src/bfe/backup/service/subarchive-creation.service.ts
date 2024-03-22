import { getApplicationConfig } from "../../../misc/application-config.singleton";
import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import { BackupExecution } from "../repository/backup-execution.repository";

export class SubarchiveCreationService {
	public splitOriginalTarIntoSubarchives = async (exec: BackupExecution): Promise<void> => {
		await (async () => {
			await loggingService.logAndPrint("About to create subarchive directory...");
			// #Make directory for the subarchives
			const mkdirCommand: ChildProcessCommand = {
				executable: "mkdir",
				argumentz: ["dir_" + exec.artefactName],
			};
			await childProcessService.executeChildProcess(mkdirCommand);
			await loggingService.logAndPrint("Subarchive directory created.");
		})();

		await (async () => {
			// #Get how many blocks the full archive is using, so we know how many splits to make
			const duCommand: ChildProcessCommand = {
				executable: "du",
				argumentz: [exec.artefactName + ".tar"],
			};
			const duOutput = await childProcessService.executeChildProcess(duCommand);

			// Based on the default BLOCKS_PER_TARSPLITTER_SPLIT environment variable (100000)
			// we will end up with 100MB splits
			const blocksUsed = parseInt(duOutput);
			const splitsToMake =
				parseInt(blocksUsed / getApplicationConfig().blocksPerTarsplitterSplit + "") + 1 + "";

			await loggingService.logAndPrint(
				"About to use tarsplitter to create subarchives along file division lines. Ideally " +
					splitsToMake +
					" pieces, if possible."
			);
			// #Split original tar into subarchives
			const tarsplitterCommand: ChildProcessCommand = {
				executable: getApplicationConfig().tarsplitterBinPath,
				argumentz: [
					"-m",
					"split",
					"-i",
					exec.artefactName + ".tar",
					"-o",
					"dir_" + exec.artefactName + "/" + exec.artefactName,
					"-p",
					splitsToMake,
				],
			};
			await childProcessService.executeChildProcess(tarsplitterCommand, false);
		})();

		await (async () => {
			// #Delete original archive to save space
			await loggingService.logAndPrint("Removing original tar archive file");
			const originalRmCommand: ChildProcessCommand = {
				executable: "rm",
				argumentz: [exec.artefactName + ".tar"],
			};
			await childProcessService.executeChildProcess(originalRmCommand);
		})();
	};
}

export const subarchiveCreationService = new SubarchiveCreationService();
