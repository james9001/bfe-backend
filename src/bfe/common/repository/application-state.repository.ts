import * as Prisma from "@prisma/client";
import { loggingService } from "../service/logging.service";
import { prismaWrapperService } from "../service/prisma-wrapper.service";

export class ApplicationStateRepository {
	prisma = new Prisma.PrismaClient();

	public get = async (): Promise<ApplicationState> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const state = (await this.prisma.applicationState.findMany({ where: {} }))[0];
			return new ApplicationState(state);
		});
	};

	public update = async (state: ApplicationState, doValidation = true): Promise<void> => {
		if (doValidation) {
			const beforeUpdate = await this.get();
			if (
				state._status != ApplicationStateStatus.FREE &&
				beforeUpdate._status != ApplicationStateStatus.FREE &&
				doValidation
			) {
				throw new Error("BFE is already busy!");
			}
		}
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.applicationState.update({
				where: { id: state.id },
				data: {
					status: state._status,
					currentBackupExecutionId: state.currentBackupExecutionId,
					currentUploadExecutionId: state.currentUploadExecutionId,
					currentRestorationExecutionId: state.currentRestorationExecutionId,
					errorState: state.inErrorState,
					automaticMode: state.inAutomaticMode,
				},
			});
		});
	};

	public onApplicationStart = async (): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const values = await this.prisma.applicationState.findMany({ where: {} });
			if (values.length == 1) {
				await loggingService.logAndPrint("application state found");
			} else if (values.length == 0) {
				await loggingService.logAndPrint("no application state found, creating");
				await this.prisma.applicationState.create({
					data: {
						status: "FREE",
						currentBackupExecutionId: -1,
						currentUploadExecutionId: -1,
						currentRestorationExecutionId: -1,
						errorState: false,
						automaticMode: false,
					},
				});
				await loggingService.logAndPrint("Finished creating application state");
			} else {
				throw new Error("There is more than one ApplicationState object in the DB");
			}
		});
	};

	public markAsErrorState = async (): Promise<void> => {
		const state = await this.get();
		state.inErrorState = true;
		state.inAutomaticMode = false;
		await this.update(state, false);
	};
}

export const applicationStateRepository = new ApplicationStateRepository();

export class ApplicationState {
	public id: number;
	public _status: ApplicationStateStatus;
	public currentBackupExecutionId: number;
	public currentUploadExecutionId: number;
	public currentRestorationExecutionId: number;
	public inErrorState: boolean;
	public inAutomaticMode: boolean;

	constructor(model?: Prisma.ApplicationState) {
		if (model) {
			this.id = model.id;
			this._status = Object.entries(ApplicationStateStatus).find(([_key, val]) => {
				return val === model.status;
			})?.[1] as ApplicationStateStatus;
			this.currentBackupExecutionId = model.currentBackupExecutionId
				? model.currentBackupExecutionId
				: -1;
			this.currentUploadExecutionId = model.currentUploadExecutionId
				? model.currentUploadExecutionId
				: -1;
			this.currentRestorationExecutionId = model.currentRestorationExecutionId
				? model.currentRestorationExecutionId
				: -1;
			this.inErrorState = model.errorState;
			this.inAutomaticMode = model.automaticMode;
		} else {
			this.id = -1;
			this._status = ApplicationStateStatus.FREE;
			this.currentBackupExecutionId = -1;
			this.currentUploadExecutionId = -1;
			this.currentRestorationExecutionId = -1;
			this.inErrorState = false;
			this.inAutomaticMode = false;
		}
	}
}

export enum ApplicationStateStatus {
	FREE = "FREE",
	DOING_BACKUP = "DOING_BACKUP",
	DOING_UPLOAD = "DOING_UPLOAD",
	DOING_RESTORATION = "DOING_RESTORATION",
}
