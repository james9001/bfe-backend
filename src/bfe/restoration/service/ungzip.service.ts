import {
	ChildProcessCommand,
	childProcessService,
} from "../../common/service/child-process.service";
import { loggingService } from "../../common/service/logging.service";

export class UngzipService {
	public ungzipAllPieces = async (processablePieces: string[]): Promise<string[]> => {
		await loggingService.logAndPrint("Starting de-gzippings...");
		const processedPieces: string[] = [];
		for (const processablePiece of processablePieces) {
			await (async () => {
				//gzip decompress is also in place and requires the .gz suffix
				const gzipCommand: ChildProcessCommand = {
					executable: "gzip",
					argumentz: ["-d", processablePiece],
				};
				await childProcessService.executeChildProcess(gzipCommand);
				processedPieces.push(processablePiece.substring(0, processablePiece.length - 3));
			})();
		}
		await loggingService.logAndPrint("Finished de-gzippings.");
		return processedPieces;
	};
}

export const ungzipService = new UngzipService();
