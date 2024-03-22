import * as Prisma from "@prisma/client";
import { DirectoryChecksum } from "../../common/service/checksum.service";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";
import { RestorationSecret, restorationSecretRepository } from "./restoration-secret.repository";

export class RestorationExecutionRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<RestorationExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.restorationExecution.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new RestorationExecution(entity);
		});
	};

	public getAll = async (): Promise<RestorationExecution[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.restorationExecution.findMany({});
			const models: RestorationExecution[] = [];
			for (const result of results) {
				models.push(new RestorationExecution(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.restorationExecution.delete({
				where: { id: idToDelete },
			});
		});
	};

	public update = async (entity: RestorationExecution): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.restorationExecution.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					sourceDir: entity.sourceDir,
					destinationDir: entity.destinationDir,
					preservationTargetRevealed: entity.preservationTargetRevealed,
					category: entity.category,
					checksum: entity.checksum.checksumValue,
					updatedTime: "" + Date.now(),
				},
			});
		});
	};

	public create = async (entity: RestorationExecution): Promise<RestorationExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.restorationExecution.create({
				data: {
					sourceDir: entity.sourceDir,
					destinationDir: entity.destinationDir,
					preservationTargetRevealed: entity.preservationTargetRevealed,
					category: entity.category,
					checksum: entity.checksum.checksumValue,
					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
				},
			});
			return new RestorationExecution(created);
		});
	};
}

export const restorationExecutionRepository = new RestorationExecutionRepository();

export class RestorationExecution {
	public id: number;
	public sourceDir: string;
	public destinationDir: string;
	public preservationTargetRevealed: string;
	public category: string;
	public checksum: DirectoryChecksum;
	public createdTime: string;
	public updatedTime: string;

	constructor(model?: Prisma.RestorationExecution) {
		if (model) {
			this.id = model.id;
			this.sourceDir = model.sourceDir;
			this.destinationDir = model.destinationDir;
			this.preservationTargetRevealed = model.preservationTargetRevealed;
			this.category = model.category;
			this.checksum = {
				checksumValue: model.checksum,
			};
			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
		} else {
			this.id = -1;
			this.sourceDir = "";
			this.destinationDir = "";
			this.preservationTargetRevealed = "";
			this.category = "";
			this.checksum = {
				checksumValue: "",
			};
			this.createdTime = "";
			this.updatedTime = "";
		}
	}

	public get backupDirName() {
		const pathParts = this.sourceDir.split("/");
		return pathParts[pathParts.length - 1];
	}

	public getRestorationSecrets = async (): Promise<RestorationSecret[]> => {
		return restorationSecretRepository.getAllByRestorationExecutionId(this.id);
	};
}
