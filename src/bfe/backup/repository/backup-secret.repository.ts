import * as Prisma from "@prisma/client";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";

export class BackupSecretRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<BackupSecret> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.backupSecret.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new BackupSecret(entity);
		});
	};

	public getAll = async (): Promise<BackupSecret[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.backupSecret.findMany({});
			const models: BackupSecret[] = [];
			for (const result of results) {
				models.push(new BackupSecret(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.backupSecret.delete({
				where: { id: idToDelete },
			});
		});
	};

	public getAllByBackupExecutionId = async (
		backupExecutionIdToGet: number
	): Promise<BackupSecret[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.backupSecret.findMany({
				where: { backupExecutionId: backupExecutionIdToGet },
			});
			const models: BackupSecret[] = [];
			for (const result of results) {
				models.push(new BackupSecret(result));
			}
			return models;
		});
	};

	public update = async (entity: BackupSecret): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.backupSecret.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					backupExecutionId: entity.backupExecutionId,
					encryptionType: entity.encryptionType,
					orderNumber: entity.orderNumber,
					secretValue: entity.secretValue,
					updatedTime: "" + Date.now(),
				},
			});
		});
	};

	public create = async (entity: BackupSecret): Promise<BackupSecret> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.backupSecret.create({
				data: {
					backupExecutionId: entity.backupExecutionId,
					encryptionType: entity.encryptionType,
					orderNumber: entity.orderNumber,
					secretValue: entity.secretValue,
					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
				},
			});
			return new BackupSecret(created);
		});
	};
}

export const backupSecretRepository = new BackupSecretRepository();

export class BackupSecret {
	public id: number;
	public backupExecutionId: number;
	public encryptionType: EncryptionType;
	public orderNumber: number;
	public secretValue: string;
	public createdTime: string;
	public updatedTime: string;

	constructor(model?: Prisma.BackupSecret) {
		if (model) {
			this.id = model.id;
			this.backupExecutionId = model.backupExecutionId;
			this.encryptionType = Object.entries(EncryptionType).find(([_key, val]) => {
				return val === model.encryptionType;
			})?.[1] as EncryptionType;
			this.orderNumber = model.orderNumber;
			this.secretValue = model.secretValue;
			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
		} else {
			this.id = -1;
			this.backupExecutionId = -1;
			this.encryptionType = EncryptionType.AES256;
			this.orderNumber = -1;
			this.secretValue = "";
			this.createdTime = "";
			this.updatedTime = "";
		}
	}
}

export enum EncryptionType {
	AES256 = "AES256",
	CAMELLIA256 = "CAMELLIA256",
}
