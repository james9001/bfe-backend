import * as fs from "fs";
import { ChildProcessCommand, childProcessService } from "./child-process.service";
import { loggingService } from "./logging.service";

export class MassRenamingService {
	public changeAllPiecesNamesToHaveProvidedFileExtensions = async (
		fileExtensions: string[],
		rootContainingDir: string
	): Promise<string[]> => {
		await loggingService.logAndPrint("Starting renamings...");
		const renamedThings = await this.doRenamings(rootContainingDir, fileExtensions);
		await loggingService.logAndPrint("Finished renamings.");
		return renamedThings;
	};

	private doRenamings = async (
		containingDir: string,
		fileExtensions: string[]
	): Promise<string[]> => {
		const pieces: string[] = fs.readdirSync(containingDir);
		const renamedThings: string[] = [];
		for (const processablePiece of pieces) {
			if (!fs.statSync(containingDir + "/" + processablePiece).isDirectory()) {
				await (async () => {
					const newName =
						processablePiece.indexOf(".") > -1
							? processablePiece.substring(0, processablePiece.indexOf(".")) + fileExtensions.join("")
							: processablePiece + fileExtensions.join("");
					const mvCommand: ChildProcessCommand = {
						executable: "mv",
						argumentz: [containingDir + "/" + processablePiece, containingDir + "/" + newName],
					};
					await childProcessService.executeChildProcess(mvCommand);
					renamedThings.push(containingDir + "/" + newName);
				})();
			} else {
				const renamedRecursively = await this.doRenamings(
					containingDir + "/" + processablePiece,
					fileExtensions
				);
				for (const index in renamedRecursively) {
					renamedThings.push(renamedRecursively[index]);
				}
			}
		}
		return renamedThings;
	};
}

export const massRenamingService = new MassRenamingService();
