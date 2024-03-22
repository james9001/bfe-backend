import * as Prisma from "@prisma/client";
import { Entity, EntityRepository, SearchCriteria } from "../../common/common.interface";
import { DirectoryChecksum } from "../../common/service/checksum.service";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";
import { BackupSecret, backupSecretRepository } from "./backup-secret.repository";
import { PreservationTarget, preservationTargetRepository } from "./preservation-target.repository";

export class BackupExecutionRepository implements EntityRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<BackupExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.backupExecution.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new BackupExecution(entity);
		});
	};

	public getByPreservationTargetId = async (
		preservationTargetId: number
	): Promise<BackupExecution[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.backupExecution.findMany({
				where: {
					preservationTargetId: preservationTargetId,
				},
			});
			const models: BackupExecution[] = [];
			for (const result of results) {
				models.push(new BackupExecution(result));
			}
			return models;
		});
	};

	public search = async (criteria: BackupExecutionSearchCriteria): Promise<BackupExecution[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.backupExecution.findMany({
				skip: criteria.pageSize * criteria.pageNumber,
				take: criteria.pageSize,
			});
			const models: BackupExecution[] = [];
			for (const result of results) {
				models.push(new BackupExecution(result));
			}
			return models;
		});
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public count = async (criteria: BackupExecutionSearchCriteria): Promise<number> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			return this.prisma.backupExecution.count({});
		});
	};

	public getAll = async (): Promise<BackupExecution[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.backupExecution.findMany({});
			const models: BackupExecution[] = [];
			for (const result of results) {
				models.push(new BackupExecution(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.backupExecution.delete({
				where: { id: idToDelete },
			});
		});
	};

	public update = async (entity: BackupExecution): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.backupExecution.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					preservationTargetId: entity.preservationTargetId,
					artefactName: entity.artefactName,
					category: entity.category,
					checksum: entity.checksum.checksumValue,
					updatedTime: "" + Date.now(),
					beforeProcessBytes: entity.beforeProcessBytes,
					afterProcessBytes: entity.afterProcessBytes,
				},
			});
		});
	};

	public create = async (entity: BackupExecution): Promise<BackupExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.backupExecution.create({
				data: {
					preservationTargetId: entity.preservationTargetId,
					artefactName: entity.artefactName,
					category: entity.category,
					checksum: entity.checksum.checksumValue,
					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
					beforeProcessBytes: entity.beforeProcessBytes,
					afterProcessBytes: entity.afterProcessBytes,
				},
			});
			return new BackupExecution(created);
		});
	};
}

export const backupExecutionRepository = new BackupExecutionRepository();

export class BackupExecution implements Entity {
	public id: number;
	public preservationTargetId: number;
	public artefactName: string;
	public category: string;
	public checksum: DirectoryChecksum;
	public createdTime: string;
	public updatedTime: string;
	public beforeProcessBytes: string;
	public afterProcessBytes: string;

	constructor(model?: Prisma.BackupExecution) {
		if (model) {
			this.id = model.id;
			this.preservationTargetId = model.preservationTargetId;
			this.artefactName = model.artefactName;
			this.category = model.category;
			this.checksum = {
				checksumValue: model.checksum,
			};
			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
			this.beforeProcessBytes = model.beforeProcessBytes as string;
			this.afterProcessBytes = model.afterProcessBytes as string;
		} else {
			this.id = -1;
			this.preservationTargetId = -1;
			this.artefactName = "";
			this.category = "";
			this.checksum = {
				checksumValue: "",
			};
			this.createdTime = "";
			this.updatedTime = "";
			this.beforeProcessBytes = "";
			this.afterProcessBytes = "";
		}
	}

	public getPreservationTarget = async (): Promise<PreservationTarget> => {
		return preservationTargetRepository.getById(this.preservationTargetId);
	};

	public getBackupSecrets = async (): Promise<BackupSecret[]> => {
		return backupSecretRepository.getAllByBackupExecutionId(this.id);
	};
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BackupExecutionSearchCriteria extends SearchCriteria {}
