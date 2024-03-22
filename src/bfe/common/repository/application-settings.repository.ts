import * as Prisma from "@prisma/client";
import { getApplicationConfig } from "../../../misc/application-config.singleton";
import { loggingService } from "../service/logging.service";
import { prismaWrapperService } from "../service/prisma-wrapper.service";

export class ApplicationSettingsRepository {
	prisma = new Prisma.PrismaClient();

	public get = async (): Promise<ApplicationSettings> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const settings = (await this.prisma.applicationSettings.findMany({ where: {} }))[0];
			return new ApplicationSettings(settings);
		});
	};

	public update = async (settings: ApplicationSettings): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.applicationSettings.update({
				where: { id: settings.id },
				data: {
					rcloneBwLimit: settings.rcloneBwLimit,
					defaultUploadDestination: settings.defaultUploadDestination,
					defaultUploadPath: settings.defaultUploadPath,
					defaultBackupCategory: settings.defaultBackupCategory,
					defaultSecondUploadDestination: settings.defaultSecondUploadDestination,
					defaultSecondUploadPath: settings.defaultSecondUploadPath,
					showOldDataPages: settings.showOldDataPages,
					uploadToTwoTargets: settings.uploadToTwoTargets,
					backupCopyPhaseBwLimit: settings.backupCopyPhaseBwLimit,
				},
			});
		});
	};

	public onApplicationStart = async (): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const values = await this.prisma.applicationSettings.findMany({ where: {} });
			if (values.length == 1) {
				await loggingService.logAndPrint("application settings found");
			} else if (values.length == 0) {
				await loggingService.logAndPrint("no application settings found, creating");
				await this.prisma.applicationSettings.create({
					data: {
						rcloneBwLimit: getApplicationConfig().rcloneBwlimit,
						defaultUploadDestination: "",
						defaultUploadPath: "",
						defaultBackupCategory: "",
						defaultSecondUploadDestination: "",
						defaultSecondUploadPath: "",
						showOldDataPages: false,
						uploadToTwoTargets: false,
						backupCopyPhaseBwLimit: "",
					},
				});
				await loggingService.logAndPrint("Finished creating application settings");
			} else {
				throw new Error("There is more than one ApplicationSettings object in the DB");
			}
		});
	};
}

export const applicationSettingsRepository = new ApplicationSettingsRepository();

export class ApplicationSettings {
	public id: number;
	public rcloneBwLimit: string;
	public defaultUploadDestination: string;
	public defaultUploadPath: string;
	public defaultBackupCategory: string;
	public defaultSecondUploadDestination: string;
	public defaultSecondUploadPath: string;
	public showOldDataPages: boolean;
	public uploadToTwoTargets: boolean;
	public backupCopyPhaseBwLimit: string;

	constructor(model?: Prisma.ApplicationSettings) {
		if (model) {
			this.id = model.id;
			this.rcloneBwLimit = model.rcloneBwLimit;
			this.defaultUploadDestination = model.defaultUploadDestination;
			this.defaultUploadPath = model.defaultUploadPath;
			this.defaultBackupCategory = model.defaultBackupCategory;
			this.defaultSecondUploadDestination = model.defaultSecondUploadDestination as string;
			this.defaultSecondUploadPath = model.defaultSecondUploadPath as string;
			this.showOldDataPages = model.showOldDataPages;
			this.uploadToTwoTargets = model.uploadToTwoTargets;
			this.backupCopyPhaseBwLimit = model.backupCopyPhaseBwLimit as string;
		} else {
			this.id = -1;
			this.rcloneBwLimit = "";
			this.defaultUploadDestination = "";
			this.defaultUploadPath = "";
			this.defaultBackupCategory = "";
			this.defaultSecondUploadDestination = "";
			this.defaultSecondUploadPath = "";
			this.showOldDataPages = false;
			this.uploadToTwoTargets = false;
			this.backupCopyPhaseBwLimit = "";
		}
	}
}
