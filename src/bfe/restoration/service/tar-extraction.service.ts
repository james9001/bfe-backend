import * as fs from "fs";
import { getApplicationConfig } from "../../../misc/application-config.singleton";
import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import {
	RestorationExecution,
	restorationExecutionRepository,
} from "../repository/restoration-execution.repository";

export class TarExtractionService {
	public extractAllTarArchivesInDirectory = async (exec: RestorationExecution): Promise<void> => {
		const containingDir = getApplicationConfig().appTmp + "/" + exec.backupDirName;

		const filesInContainingDir: string[] = fs.readdirSync(containingDir);

		for (const fileInContainingDir of filesInContainingDir) {
			await this.extractATar(fileInContainingDir, exec);
		}

		await loggingService.logAndPrint(
			"Finished extracting, now moving the revealed preservation target to app tmp dir itself"
		);

		await this.moveExtractedReconstructedPreservationTargetDirectoryToAppTmp(exec);

		await loggingService.logAndPrint("Finished extractAllTarArchivesInDirectory");
	};

	private extractATar = async (tarFileName: string, exec: RestorationExecution): Promise<void> => {
		await (async () => {
			const tarFilenameFullPath = exec.backupDirName + "/" + tarFileName;

			const untarCmd: ChildProcessCommand = {
				executable: "tar",
				argumentz: ["xvf", tarFilenameFullPath, "-C", exec.backupDirName + "/"],
			};
			await childProcessService.executeChildProcess(untarCmd);
		})();
	};

	private moveExtractedReconstructedPreservationTargetDirectoryToAppTmp = async (
		exec: RestorationExecution
	): Promise<void> => {
		await (async () => {
			const extractedArchiveAppTmpPath =
				getApplicationConfig().appTmp + "/" + exec.backupDirName + getApplicationConfig().appTmp;

			//This should be an array of one.
			const filesInExtractedArchiveAppTmpLol: string[] = fs.readdirSync(extractedArchiveAppTmpPath);
			if (filesInExtractedArchiveAppTmpLol.length > 1) {
				throw new Error("Expected one and only one entity in the extracted archive app tmp place");
			}
			const preservationTargetRevealed = filesInExtractedArchiveAppTmpLol[0];
			exec.preservationTargetRevealed = preservationTargetRevealed;
			await restorationExecutionRepository.update(exec);

			const preservationTargetRevealedFullPath =
				extractedArchiveAppTmpPath + "/" + preservationTargetRevealed;
			const moveCmd: ChildProcessCommand = {
				executable: "mv",
				argumentz: [preservationTargetRevealedFullPath, preservationTargetRevealed],
			};
			await childProcessService.executeChildProcess(moveCmd);
		})();

		await (async () => {
			const removeBackupWorkingDirCommand: ChildProcessCommand = {
				executable: "rm",
				argumentz: ["-rf", exec.backupDirName],
			};
			await childProcessService.executeChildProcess(removeBackupWorkingDirCommand);
		})();
	};
}

export const tarExtractionService = new TarExtractionService();
