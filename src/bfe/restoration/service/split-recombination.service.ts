import * as fs from "fs";
import { getApplicationConfig } from "../../../misc/application-config.singleton";
import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";
import { RestorationExecution } from "../repository/restoration-execution.repository";

export class SplitRecombinationService {
	public recombineAllSplitSubarchives = async (exec: RestorationExecution): Promise<void> => {
		const containingDir = getApplicationConfig().appTmp + "/" + exec.backupDirName;

		const filesInContainingDir: string[] = fs.readdirSync(containingDir);

		for (const fileInContainingDir of filesInContainingDir) {
			if (fs.statSync(containingDir + "/" + fileInContainingDir).isDirectory()) {
				await this.recombineSplitSubarchive(fileInContainingDir, exec);
			}
		}

		await loggingService.logAndPrint("Finished recombineAllSplitSubarchives");
	};

	private recombineSplitSubarchive = async (
		splitSubarchiveDir: string,
		exec: RestorationExecution
	): Promise<void> => {
		await (async () => {
			const splitSubarchiveNotDir = splitSubarchiveDir.substring(4);
			const splitSubarchivePiecesWildcard =
				exec.backupDirName + "/" + splitSubarchiveDir + "/" + splitSubarchiveNotDir + "*";
			const recombinedSubarchiveName = exec.backupDirName + "/" + splitSubarchiveNotDir;

			const concatCmd: ChildProcessCommand = {
				executable: "cat",
				argumentz: [splitSubarchivePiecesWildcard, ">", recombinedSubarchiveName],
			};
			await childProcessService.executeChildProcess(concatCmd, true, true);
		})();

		await (async () => {
			const splitSubarchiveDirFullPath = exec.backupDirName + "/" + splitSubarchiveDir;

			const deleteSplitSubarchiveDirCmd: ChildProcessCommand = {
				executable: "rm",
				argumentz: ["-rf", splitSubarchiveDirFullPath],
			};
			await childProcessService.executeChildProcess(deleteSplitSubarchiveDirCmd);
		})();
	};
}

export const splitRecombinationService = new SplitRecombinationService();
