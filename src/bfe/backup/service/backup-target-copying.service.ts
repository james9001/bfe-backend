import { applicationSettingsRepository } from "../../common/repository/application-settings.repository";
import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import { BackupExecution } from "../repository/backup-execution.repository";

export class BackupTargetCopyingService {
	public copyPreservationTargetToTemp = async (backupRequest: BackupExecution): Promise<void> => {
		await (async () => {
			const settings = await applicationSettingsRepository.get();
			await loggingService.logAndPrint("About to copy preservation target to temp directory...");
			const command: ChildProcessCommand = {
				executable: "rsync",
				argumentz: [
					"-a",
					"--bwlimit",
					settings.backupCopyPhaseBwLimit,
					(await backupRequest.getPreservationTarget()).fullPath,
					".",
				],
				//24 is emitted when files "vanish" i.e. rsync sees them when it starts the copy,
				// but they disappear when its their turn to actually be copied.
				//It isn't a fatal error, everything else gets copied successfully.
				additionalAcceptableExitCodes: [24],
			};
			await childProcessService.executeChildProcess(command);
		})();

		//TODO: reevaluate whether this is necessary and/or a good idea
		await (async () => {
			await loggingService.logAndPrint("Fixing permissions in temp directory...");
			const commandTwo: ChildProcessCommand = {
				executable: "chmod",
				argumentz: ["-R", "755", (await backupRequest.getPreservationTarget()).directoryName],
			};
			await childProcessService.executeChildProcess(commandTwo);
		})();
	};
}

export const backupTargetCopyingService = new BackupTargetCopyingService();
