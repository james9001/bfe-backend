import { spawn, spawnSync } from "child_process";
import events from "events";
import { getApplicationConfig } from "../../../misc/application-config.singleton";
import { loggingService } from "./logging.service";

export const childProcessEventEmitter = new events.EventEmitter();
childProcessEventEmitter.setMaxListeners(0);

export const awaitingKillStateGlobal: AwaitingKillState = {
	isAwaitingKill: false,
	mostRecentKillOutcome: "",
	probablyStuck: false,
};

export interface AwaitingKillState {
	isAwaitingKill: boolean;
	mostRecentKillOutcome: string;
	probablyStuck: boolean;
}

//TODO: refactor
export class ChildProcessService {
	public executeChildProcess = async (
		toExecute: ChildProcessCommand,
		logAllDataEvents = true,
		useShellMode = false,
		concatenateOutput = true
	): Promise<string> => {
		toExecute.hasExited = false;
		if (logAllDataEvents) {
			await loggingService.logAndPrintChildProcessCommand(toExecute);
		}

		const child = spawn(toExecute.executable, toExecute.argumentz, {
			cwd: getApplicationConfig().appTmp,
			shell: useShellMode,
		});

		let childStdOut = "";
		child.stdout.on("data", (data) => {
			const returnedOutput: string = data.toString().trim();
			if (concatenateOutput) {
				childStdOut += returnedOutput;
			} else {
				childStdOut = returnedOutput;
			}
			if (logAllDataEvents) {
				console.log(childStdOut);
			}
		});
		let childStdErr = "";
		child.stderr.on("data", (data) => {
			const returnedOutput: string = data.toString().trim();
			if (concatenateOutput) {
				childStdErr += returnedOutput;
			} else {
				childStdErr = returnedOutput;
			}
			if (logAllDataEvents) {
				console.log(childStdErr);
			}
		});
		// https://nodejs.org/docs/latest-v18.x/api/child_process.html#subprocesskillsignal
		childProcessEventEmitter.on("KillCurrentProcess", async () => {
			if (toExecute.executable !== "date") {
				if (!toExecute.hasExited) {
					await loggingService.logAndPrint(
						"KillCurrentProcess event received. Calling kill on child process: " + toExecute.executable
					);
					//Despite the name, this does not actually send a SIGKILL. It sends a SIGTERM.
					//See https://man7.org/linux/man-pages/man7/signal.7.html
					const killResult = child.kill();
					console.log("Kill call on " + toExecute.executable + " - success?: " + killResult);
				} else {
					await loggingService.logAndPrint(
						"KillCurrentProcess event received. This process has already exited though: " +
							toExecute.executable
					);
				}
			}
		});

		return new Promise<string>((resolve, reject) => {
			let hasExitHappened = false;
			let hasStdOutCloseHappened = false;
			let hasStdErrCloseHappened = false;

			const finishFunc = () => {
				if (hasExitHappened && hasStdOutCloseHappened && hasStdErrCloseHappened) {
					if (
						child.exitCode !== 0 &&
						(!toExecute.additionalAcceptableExitCodes ||
							(this.isNumber(child.exitCode) &&
								!toExecute.additionalAcceptableExitCodes!.includes(child.exitCode!)))
					) {
						console.log(
							"finishFunc reject: " + toExecute.executable + " returned exit code " + child.exitCode
						);
						reject(
							"finishFunc reject: " + toExecute.executable + " returned exit code " + child.exitCode
						);
					} else {
						if (awaitingKillStateGlobal.isAwaitingKill && toExecute.executable !== "date") {
							console.log(
								"finishFunc reject: " +
									toExecute.executable +
									" returned exit code " +
									child.exitCode +
									" - we are awaiting child process kill however."
							);
							reject(
								"finishFunc reject: " +
									toExecute.executable +
									" returned exit code " +
									child.exitCode +
									" - we are awaiting child process kill however."
							);
						}
					}
					if (toExecute.executable !== "date" && logAllDataEvents) {
						console.log(
							"finishFunc resolve: " + toExecute.executable + " returned exit code " + child.exitCode
						);
					}
					resolve(childStdOut);
				}
			};

			child.on("exit", async (code, signal) => {
				if (logAllDataEvents) {
					await loggingService.logAndPrint(
						toExecute.executable +
							" exited. exit code: " +
							child.exitCode +
							" (code: " +
							code +
							" signal: " +
							signal +
							")"
					);
				}
				hasExitHappened = true;
				toExecute.hasExited = true;

				finishFunc();
			});

			child.stdout.on("close", async () => {
				if (logAllDataEvents) {
					await loggingService.logAndPrint(
						toExecute.executable +
							" stdout closing. (current exit code: " +
							child.exitCode +
							") stdout:" +
							childStdOut
					);
				}
				hasStdOutCloseHappened = true;

				finishFunc();
			});
			child.stderr.on("close", async () => {
				if (logAllDataEvents) {
					await loggingService.logAndPrint(
						toExecute.executable +
							" stderr closing. (current exit code: " +
							child.exitCode +
							") stderr:" +
							childStdErr
					);
				}
				hasStdErrCloseHappened = true;

				finishFunc();
			});
		});
	};

	public executeChildProcessSyncWithStdInAndCurrentWorkingDirAndLcAllC = async (
		toExecute: ChildProcessCommand,
		stdIn?: Buffer
	): Promise<Buffer> => {
		await loggingService.logAndPrintChildProcessCommand(toExecute);

		const childProcess = spawnSync(toExecute.executable, toExecute.argumentz, {
			cwd: getApplicationConfig().appTmp,
			env: { ...process.env, LC_ALL: "C" },
			input: stdIn,
		});

		return Promise.resolve(childProcess.stdout);
	};

	private isNumber = (value?: string | number | null): boolean => {
		return value != null && value !== "" && !isNaN(Number(value.toString()));
	};
}

export const childProcessService = new ChildProcessService();

export interface ChildProcessCommand {
	executable: string;
	argumentz: string[];
	hasExited?: boolean;
	additionalAcceptableExitCodes?: number[];
}
