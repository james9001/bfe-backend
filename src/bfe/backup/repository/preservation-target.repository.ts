import * as Prisma from "@prisma/client";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";

export class PreservationTargetRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<PreservationTarget> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.preservationTarget.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new PreservationTarget(entity);
		});
	};

	public getByCategory = async (category: string): Promise<PreservationTarget[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.preservationTarget.findMany({
				where: {
					category: category,
				},
			});
			const models: PreservationTarget[] = [];
			for (const result of results) {
				models.push(new PreservationTarget(result));
			}
			return models;
		});
	};

	public getAll = async (): Promise<PreservationTarget[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.preservationTarget.findMany({});
			const models: PreservationTarget[] = [];
			for (const result of results) {
				models.push(new PreservationTarget(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.preservationTarget.delete({
				where: { id: idToDelete },
			});
		});
	};

	public update = async (entity: PreservationTarget): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.preservationTarget.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					type: entity.type,
					fullPath: entity.fullPath,
					updatedTime: "" + Date.now(),
					priorityLabel: entity.priorityLabel,
					category: entity.category,
					name: entity.name,
				},
			});
		});
	};

	public create = async (entity: PreservationTarget): Promise<PreservationTarget> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.preservationTarget.create({
				data: {
					type: entity.type,
					fullPath: entity.fullPath,
					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
					priorityLabel: entity.priorityLabel,
					category: entity.category,
					name: entity.name,
				},
			});
			return new PreservationTarget(created);
		});
	};
}

export const preservationTargetRepository = new PreservationTargetRepository();

export class PreservationTarget {
	public id: number;
	public name: string;
	public type: PreservationTargetType;
	public fullPath: string;
	public createdTime: string;
	public updatedTime: string;
	public priorityLabel: string;
	public category: string;

	constructor(model?: Prisma.PreservationTarget) {
		if (model) {
			this.id = model.id;
			this.name = model.name as string;
			this.type = Object.entries(PreservationTargetType).find(([_key, val]) => {
				return val === model.type;
			})?.[1] as PreservationTargetType;
			this.fullPath = model.fullPath;
			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
			this.priorityLabel = model.priorityLabel as string;
			this.category = model.category as string;
		} else {
			this.id = -1;
			this.name = "";
			this.type = PreservationTargetType.MUTABLE;
			this.fullPath = "";
			this.createdTime = "";
			this.updatedTime = "";
			this.priorityLabel = "";
			this.category = "";
		}
	}

	public get directoryName() {
		const pathParts = this.fullPath.split("/");
		return pathParts[pathParts.length - 1];
	}
}

export enum PreservationTargetType {
	IMMUTABLE = "IMMUTABLE",
	MUTABLE = "MUTABLE",
}
