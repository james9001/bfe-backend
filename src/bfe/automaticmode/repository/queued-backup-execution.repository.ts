import * as Prisma from "@prisma/client";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";

export class QueuedBackupExecutionRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<QueuedBackupExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.queuedBackupExecution.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new QueuedBackupExecution(entity);
		});
	};

	public getAll = async (): Promise<QueuedBackupExecution[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.queuedBackupExecution.findMany({});
			const models: QueuedBackupExecution[] = [];
			for (const result of results) {
				models.push(new QueuedBackupExecution(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.queuedBackupExecution.delete({
				where: { id: idToDelete },
			});
		});
	};

	public deleteAll = async (): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.queuedBackupExecution.deleteMany({});
		});
	};

	public update = async (entity: QueuedBackupExecution): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.queuedBackupExecution.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					preservationTargetId: entity.preservationTargetId,

					orderNumber: entity.orderNumber,
					intendedBackupCategory: entity.intendedBackupCategory,
					intendedUploadDestination: entity.intendedUploadDestination,
					intendedUploadPath: entity.intendedUploadPath,
					secondIntendedUploadDestination: entity.secondIntendedUploadDestination,
					secondIntendedUploadPath: entity.secondIntendedUploadPath,
					actualBackupExecutionId: entity.actualBackupExecutionId,

					updatedTime: "" + Date.now(),
				},
			});
		});
	};

	public create = async (entity: QueuedBackupExecution): Promise<QueuedBackupExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.queuedBackupExecution.create({
				data: {
					preservationTargetId: entity.preservationTargetId,

					orderNumber: entity.orderNumber,
					intendedBackupCategory: entity.intendedBackupCategory,
					intendedUploadDestination: entity.intendedUploadDestination,
					intendedUploadPath: entity.intendedUploadPath,
					secondIntendedUploadDestination: entity.secondIntendedUploadDestination,
					secondIntendedUploadPath: entity.secondIntendedUploadPath,
					actualBackupExecutionId: entity.actualBackupExecutionId,

					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
				},
			});
			return new QueuedBackupExecution(created);
		});
	};
}

export const queuedBackupExecutionRepository = new QueuedBackupExecutionRepository();

export class QueuedBackupExecution {
	public id: number;

	public preservationTargetId: number;
	public orderNumber: number;
	public intendedBackupCategory: string;
	public intendedUploadDestination: string;
	public intendedUploadPath: string;
	public secondIntendedUploadDestination: string;
	public secondIntendedUploadPath: string;
	public actualBackupExecutionId: number;

	public createdTime: string;
	public updatedTime: string;

	constructor(model?: Prisma.QueuedBackupExecution) {
		if (model) {
			this.id = model.id;

			this.preservationTargetId = model.preservationTargetId;
			this.orderNumber = model.orderNumber;
			this.intendedBackupCategory = model.intendedBackupCategory;
			this.intendedUploadDestination = model.intendedUploadDestination;
			this.intendedUploadPath = model.intendedUploadPath;
			this.secondIntendedUploadDestination = model.secondIntendedUploadDestination as string;
			this.secondIntendedUploadPath = model.secondIntendedUploadPath as string;
			this.actualBackupExecutionId = model.actualBackupExecutionId
				? model.actualBackupExecutionId
				: -1;

			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
		} else {
			this.id = -1;

			this.preservationTargetId = -1;
			this.orderNumber = -1;
			this.intendedBackupCategory = "";
			this.intendedUploadDestination = "";
			this.secondIntendedUploadDestination = "";
			this.secondIntendedUploadPath = "";
			this.intendedUploadPath = "";
			this.actualBackupExecutionId = -1;

			this.createdTime = "";
			this.updatedTime = "";
		}
	}
}
