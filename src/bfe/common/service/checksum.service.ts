import {
	BackupExecution,
	backupExecutionRepository,
} from "../../backup/repository/backup-execution.repository";
import { RestorationExecution } from "../../restoration/repository/restoration-execution.repository";
import { ChildProcessCommand, childProcessService } from "./child-process.service";
import { loggingService } from "./logging.service";

export class ChecksumService {
	public getChecksumForBackupExecution = async (exec: BackupExecution): Promise<void> => {
		const checksum = {
			checksumValue: await this.getDirectoryChecksum(
				(await exec.getPreservationTarget()).directoryName + "/"
			),
		};
		exec.checksum = checksum;
		await backupExecutionRepository.update(exec);
	};

	public compareRestoredChecksumWithStatedChecksum = async (
		exec: RestorationExecution
	): Promise<void> => {
		const checksumAfterRestoration = await this.getDirectoryChecksum(
			exec.preservationTargetRevealed + "/"
		);

		if (checksumAfterRestoration !== exec.checksum.checksumValue) {
			throw new Error(
				"CHECKSUM DOESNT MATCH!!! FAIL! " +
					"Old checksum: " +
					exec.checksum.checksumValue +
					"|||" +
					"New checksum: " +
					checksumAfterRestoration +
					"|||"
			);
		}

		await loggingService.logAndPrint("Checksums match! Great success!");
	};

	private getDirectoryChecksum = async (checksumTarget: string): Promise<string> => {
		const findCommand: ChildProcessCommand = {
			executable: "find",
			argumentz: [checksumTarget, "-type", "f", "-exec", "md5sum", "{}", "+"],
		};

		const findChildStdOut =
			await childProcessService.executeChildProcessSyncWithStdInAndCurrentWorkingDirAndLcAllC(
				findCommand
			);

		const sortCommand: ChildProcessCommand = {
			executable: "sort",
			argumentz: [],
		};

		const sortChildStdOut =
			await childProcessService.executeChildProcessSyncWithStdInAndCurrentWorkingDirAndLcAllC(
				sortCommand,
				findChildStdOut
			);

		const md5sumCommand: ChildProcessCommand = {
			executable: "md5sum",
			argumentz: [],
		};

		const md5sumChildStdOut =
			await childProcessService.executeChildProcessSyncWithStdInAndCurrentWorkingDirAndLcAllC(
				md5sumCommand,
				sortChildStdOut
			);

		const md5sumOutput = md5sumChildStdOut.toString();
		const checksum = md5sumOutput.split(" ")[0];
		await loggingService.logAndPrint("Checksum is " + checksum);

		return Promise.resolve(checksum);
	};
}

export const checksumService = new ChecksumService();

export interface DirectoryChecksum {
	checksumValue: string;
}
