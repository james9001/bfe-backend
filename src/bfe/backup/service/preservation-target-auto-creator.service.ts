import * as fs from "fs";
import {
	PreservationTarget,
	PreservationTargetType,
	preservationTargetRepository,
} from "../repository/preservation-target.repository";

export class PreservationTargetAutoCreatorService {
	public autoCreatePreservationTargetsForWatchDirectories = async (
		watchDirectories: string[],
		preservationTargetType: string,
		preservationTargetCategory: string
	): Promise<void> => {
		//Validate first
		for (const watchDirectory of watchDirectories) {
			await this.validateWatchDirectoryContainsOnlySubdirectories(watchDirectory);
		}
		//If validation passed, actually set them up
		for (const watchDirectory of watchDirectories) {
			await this.autoCreatePreservationTargetsForWatchDirectory(
				watchDirectory,
				preservationTargetType,
				preservationTargetCategory
			);
		}
	};

	private validateWatchDirectoryContainsOnlySubdirectories = async (
		watchDirectory: string
	): Promise<void> => {
		const filesInWatchDirectory: string[] = fs.readdirSync(watchDirectory);
		for (const fileInWatchDirectory of filesInWatchDirectory) {
			if (!fs.statSync(watchDirectory + "/" + fileInWatchDirectory).isDirectory()) {
				throw new Error(
					`Validation failed: Inside ${watchDirectory} is a file: ${fileInWatchDirectory} which is invalid`
				);
			}
		}
	};

	private autoCreatePreservationTargetsForWatchDirectory = async (
		watchDirectory: string,
		preservationTargetType: string,
		preservationTargetCategory: string
	): Promise<void> => {
		const filesInWatchDirectory: string[] = fs.readdirSync(watchDirectory);
		for (const subdirectoryToPreserve of filesInWatchDirectory) {
			const newItem = new PreservationTarget();
			newItem.type = Object.entries(PreservationTargetType).find(([_key, val]) => {
				return val === preservationTargetType;
			})?.[1] as PreservationTargetType;
			newItem.fullPath = `${watchDirectory}/${subdirectoryToPreserve}`;
			newItem.priorityLabel = "0 - Auto Created";
			newItem.category = preservationTargetCategory;
			newItem.name = `${preservationTargetCategory}: ${subdirectoryToPreserve}`;
			await preservationTargetRepository.create(newItem);
		}
	};
}

export const preservationTargetAutoCreatorService = new PreservationTargetAutoCreatorService();
