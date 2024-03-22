import { getApplicationConfig } from "../../../misc/application-config.singleton";
import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import { BackupExecution } from "../repository/backup-execution.repository";

export class TarCreationService {
	public createTarFromBackupTarget = async (exec: BackupExecution): Promise<void> => {
		await this.tarDirectory(
			exec.artefactName,
			(
				getApplicationConfig().appTmp +
				"/" +
				(
					await exec.getPreservationTarget()
				).directoryName
			).substring(1)
		);
		await this.removeTempCopy((await exec.getPreservationTarget()).directoryName);
	};

	private tarDirectory = async (artefactName: string, directoryPath: string): Promise<void> => {
		await loggingService.logAndPrint(
			"About to compress into tar! " + artefactName + ".tar from " + directoryPath + "..."
		);
		const command: ChildProcessCommand = {
			executable: "tar",
			argumentz: ["cf", artefactName + ".tar", "-C", "/", directoryPath],
		};
		await childProcessService.executeChildProcess(command, true);
	};

	private removeTempCopy = async (tempCopyPath: string): Promise<void> => {
		await loggingService.logAndPrint("Removing copied directory...");
		const command: ChildProcessCommand = {
			executable: "rm",
			argumentz: ["-R", tempCopyPath],
		};
		await childProcessService.executeChildProcess(command, true);
	};
}

export const tarCreationService = new TarCreationService();
