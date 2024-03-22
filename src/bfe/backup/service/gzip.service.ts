import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";

export class GzipService {
	public gzipAllPieces = async (processablePieces: string[]): Promise<string[]> => {
		await loggingService.logAndPrint("Starting gzippings...");
		const processedPieces: string[] = [];
		for (const processablePiece of processablePieces) {
			await (async () => {
				//Gzip the piece. This command seems to run in-place by default. (It also predictably renames it to add .gz on the end)
				const gzipCommand: ChildProcessCommand = {
					executable: "gzip",
					argumentz: [processablePiece],
				};
				await childProcessService.executeChildProcess(gzipCommand);
				processedPieces.push(processablePiece + ".gz");
			})();
		}
		await loggingService.logAndPrint("Finished gzippings.");
		return processedPieces;
	};
}

export const gzipService = new GzipService();
