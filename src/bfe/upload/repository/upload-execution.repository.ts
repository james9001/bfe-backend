import * as Prisma from "@prisma/client";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";

export class UploadExecutionRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<UploadExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.uploadExecution.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new UploadExecution(entity);
		});
	};

	public getByBackupExecutionId = async (
		findBackupExecutionId: number
	): Promise<UploadExecution[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.uploadExecution.findMany({
				where: {
					backupExecutionId: findBackupExecutionId,
				},
			});
			const models: UploadExecution[] = [];
			for (const result of results) {
				models.push(new UploadExecution(result));
			}
			return models;
		});
	};

	public getAll = async (): Promise<UploadExecution[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.uploadExecution.findMany({});
			const models: UploadExecution[] = [];
			for (const result of results) {
				models.push(new UploadExecution(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.uploadExecution.delete({
				where: { id: idToDelete },
			});
		});
	};

	public update = async (entity: UploadExecution): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.uploadExecution.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					backupExecutionId: entity.backupExecutionId,
					status: entity.status,
					destination: entity.destination,
					destinationPath: entity.destinationPath,
					updatedTime: "" + Date.now(),
					completedTime: entity.completedTime,
				},
			});
		});
	};

	public create = async (entity: UploadExecution): Promise<UploadExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.uploadExecution.create({
				data: {
					backupExecutionId: entity.backupExecutionId,
					status: entity.status,
					destination: entity.destination,
					destinationPath: entity.destinationPath,
					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
				},
			});
			return new UploadExecution(created);
		});
	};
}

export const uploadExecutionRepository = new UploadExecutionRepository();

export class UploadExecution {
	public id: number;
	public backupExecutionId: number;
	public status: UploadStatus;
	public destination: string;
	public destinationPath: string;
	public createdTime: string;
	public updatedTime: string;
	public completedTime: string;

	constructor(model?: Prisma.UploadExecution) {
		if (model) {
			this.id = model.id;
			this.backupExecutionId = model.backupExecutionId;
			this.status = Object.entries(UploadStatus).find(([_key, val]) => {
				return val === model.status;
			})?.[1] as UploadStatus;
			this.destination = model.destination;
			this.destinationPath = model.destinationPath;
			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
			this.completedTime = model.completedTime as string;
		} else {
			this.id = -1;
			this.backupExecutionId = -1;
			this.status = UploadStatus.NOT_STARTED;
			this.destination = "";
			this.destinationPath = "";
			this.createdTime = "";
			this.updatedTime = "";
			this.completedTime = "";
		}
	}
}

export enum UploadStatus {
	NOT_STARTED = "NOT_STARTED",
	IN_PROGRESS = "IN_PROGRESS",
	PAUSED = "PAUSED",
	REMOVED = "REMOVED",
	COMPLETE = "COMPLETE",
}
