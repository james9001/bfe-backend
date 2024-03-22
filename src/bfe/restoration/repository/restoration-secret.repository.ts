import * as Prisma from "@prisma/client";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";

export class RestorationSecretRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<RestorationSecret> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.restorationSecret.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new RestorationSecret(entity);
		});
	};

	public getAll = async (): Promise<RestorationSecret[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.restorationSecret.findMany({});
			const models: RestorationSecret[] = [];
			for (const result of results) {
				models.push(new RestorationSecret(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.restorationSecret.delete({
				where: { id: idToDelete },
			});
		});
	};

	public getAllByRestorationExecutionId = async (idToGet: number): Promise<RestorationSecret[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.restorationSecret.findMany({
				where: { restorationExecutionId: idToGet },
			});
			const models: RestorationSecret[] = [];
			for (const result of results) {
				models.push(new RestorationSecret(result));
			}
			return models;
		});
	};

	public update = async (entity: RestorationSecret): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.restorationSecret.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					restorationExecutionId: entity.restorationExecutionId,
					encryptionType: entity.encryptionType,
					orderNumber: entity.orderNumber,
					secretValue: entity.secretValue,
					updatedTime: "" + Date.now(),
				},
			});
		});
	};

	public create = async (entity: RestorationSecret): Promise<RestorationSecret> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.restorationSecret.create({
				data: {
					restorationExecutionId: entity.restorationExecutionId,
					encryptionType: entity.encryptionType,
					orderNumber: entity.orderNumber,
					secretValue: entity.secretValue,
					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
				},
			});
			return new RestorationSecret(created);
		});
	};
}

export const restorationSecretRepository = new RestorationSecretRepository();

export class RestorationSecret {
	public id: number;
	public restorationExecutionId: number;
	public encryptionType: EncryptionType;
	public orderNumber: number;
	public secretValue: string;
	public createdTime: string;
	public updatedTime: string;

	constructor(model?: Prisma.RestorationSecret) {
		if (model) {
			this.id = model.id;
			this.restorationExecutionId = model.restorationExecutionId;
			this.encryptionType = Object.entries(EncryptionType).find(([_key, val]) => {
				return val === model.encryptionType;
			})?.[1] as EncryptionType;
			this.orderNumber = model.orderNumber;
			this.secretValue = model.secretValue;
			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
		} else {
			this.id = -1;
			this.restorationExecutionId = -1;
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
