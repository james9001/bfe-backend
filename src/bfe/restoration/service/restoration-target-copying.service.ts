import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import { RestorationExecution } from "../repository/restoration-execution.repository";

export class RestorationTargetCopyingService {
	public copyBackupForRestoringIntoTemp = async (exec: RestorationExecution): Promise<void> => {
		await (async () => {
			await loggingService.logAndPrint("About to copy backup for restoration to temp directory...");
			const command: ChildProcessCommand = {
				executable: "cp",
				argumentz: ["-R", exec.sourceDir, exec.backupDirName],
			};
			await childProcessService.executeChildProcess(command);
		})();

		//TODO: reevaluate whether this is necessary and/or a good idea
		await (async () => {
			await loggingService.logAndPrint("Fixing permissions in temp directory...");
			const commandTwo: ChildProcessCommand = {
				executable: "chmod",
				argumentz: ["-R", "755", exec.backupDirName],
			};
			await childProcessService.executeChildProcess(commandTwo);
		})();
	};

	public moveRestoredBackupToDestinationDir = async (exec: RestorationExecution): Promise<void> => {
		await (async () => {
			const command: ChildProcessCommand = {
				executable: "mv",
				argumentz: [exec.preservationTargetRevealed, exec.destinationDir],
			};
			await childProcessService.executeChildProcess(command);
		})();
	};
}

export const restorationTargetCopyingService = new RestorationTargetCopyingService();
