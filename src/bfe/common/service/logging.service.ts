import { ChildProcessCommand } from "./child-process.service";
import { timeService } from "./time.service";

export class LoggingService {
	public logAndPrint = async (text: string): Promise<void> => {
		const prettyTime = await timeService.getPrettyTime();
		const logMessage = prettyTime + " " + text;
		console.log(logMessage);
	};

	public logAndPrintChildProcessCommand = async (command: ChildProcessCommand): Promise<void> => {
		await this.logAndPrint("-----------------------------------");
		await this.logAndPrint(command.executable + " " + command.argumentz.join(" "));
	};
}

export const loggingService = new LoggingService();
