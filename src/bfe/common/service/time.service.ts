import { childProcessService } from "./child-process.service";

export class TimeService {
	public getTimestamp = async (): Promise<string> => {
		return childProcessService.executeChildProcess(
			{
				executable: "date",
				argumentz: ["+%s"],
			},
			false
		);
	};

	public getPrettyTime = async (): Promise<string> => {
		return childProcessService.executeChildProcess(
			{
				executable: "date",
				argumentz: [],
			},
			false
		);
	};
}

export const timeService = new TimeService();
