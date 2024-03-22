import {
	ApplicationSettings,
	applicationSettingsRepository,
} from "../../common/repository/application-settings.repository";
import {
	ApplicationState,
	applicationStateRepository,
} from "../../common/repository/application-state.repository";
import {
	uploadExecutionRepository,
	UploadStatus,
} from "../../upload/repository/upload-execution.repository";
import { BackupExecution, backupExecutionRepository } from "./backup-execution.repository";
import {
	PreservationTarget,
	preservationTargetRepository,
	PreservationTargetType,
} from "./preservation-target.repository";

/*
 * TODO: refactor this module a lot.
 * This is basically prototype-stage
 */
export class PreservationCategoryRepository {
	public getAllBasic = async (): Promise<BasicPreservationCategory[]> => {
		const globalState = await applicationStateRepository.get();
		const settings = await applicationSettingsRepository.get();

		const basics = await Promise.all(
			(
				await this.getAllInternalBasic()
			).map(async (preservationCategory) => {
				const detail = await this.getDetail(preservationCategory.name, preservationCategory.isMutable);

				let counter = 0;
				let allExist = true;
				const uploadCompletedTimes = [];
				for (const target of detail.preservationTargets) {
					//If you either don't have a backup exec yet, or
					//If you do have one and its not the currently executed one
					if (
						!target.mostRecentBackup ||
						(target.mostRecentBackup &&
							target.mostRecentBackup.id !== globalState.currentBackupExecutionId)
					) {
						if (!target.mostRecentBackup || target.mostRecentBackup.uploads.length === 0) {
							allExist = false;
						} else {
							for (const upload of target.mostRecentBackup.uploads) {
								if (!upload.completedTime) {
									allExist = false;
								}
								uploadCompletedTimes.push(upload.completedTime);
							}
						}

						counter++;
					}
				}
				//TODO: Remove magic numbers.. Oh dear.
				const furthestBackValue =
					counter == 0
						? "-2"
						: allExist
						? uploadCompletedTimes.sort((a, b) => {
								const aa = BigInt(a);
								const bb = BigInt(b);
								if (aa > bb) {
									return 1;
								} else if (aa < bb) {
									return -1;
								} else {
									return 0;
								}
						  })[0]
						: "-1";

				return {
					name: preservationCategory.name,
					isMutable: preservationCategory.isMutable,
					furthestBackUploadCompletedTimeForTargetsMostRecentBackups: furthestBackValue,
					uploadIssues: await this.hasUploadIssues(globalState, settings, detail),
				};
			})
		);

		return basics;
	};

	//TODO: refactor
	//This is kind of calculating a proxy for Backup Execution State (which doesn't exist)
	//This says: if the most recent Backup Execution per PT is finished but didn't upload anything, there are major issues
	private hasUploadIssues = async (
		globalState: ApplicationState,
		settings: ApplicationSettings,
		detail: DetailedPreservationCategory
	): Promise<boolean> => {
		for (const target of detail.preservationTargets) {
			//If the PT has a backup exec and it isnt currently being run
			if (
				target.mostRecentBackup &&
				target.mostRecentBackup.id !== globalState.currentBackupExecutionId
			) {
				const unsuccessfulUploads = target.mostRecentBackup.uploads.filter(
					(dto) => dto.status !== "COMPLETE" || !dto.completedTime
				);

				const anythingWrong = settings.uploadToTwoTargets
					? unsuccessfulUploads.length > 0 || target.mostRecentBackup.uploads.length < 2
					: unsuccessfulUploads.length > 0 || target.mostRecentBackup.uploads.length < 1;
				if (anythingWrong) {
					return true;
				}
			}
		}
		return false;
	};

	private getAllInternalBasic = async (): Promise<InternalBasicPreservationCategory[]> => {
		const targets = await preservationTargetRepository.getAll();

		const mutable = [
			...new Set(
				targets
					.filter((target) => target.type === PreservationTargetType.MUTABLE)
					.map((target) => target.category)
			),
		].map((category) => {
			return {
				name: category,
				isMutable: true,
			};
		});

		const immutable = [
			...new Set(
				targets
					.filter((target) => target.type === PreservationTargetType.IMMUTABLE)
					.map((target) => target.category)
			),
		].map((category) => {
			return {
				name: category,
				isMutable: false,
			};
		});

		return [...mutable, ...immutable];
	};

	public getDetail = async (
		name: string,
		isMutable: boolean
	): Promise<DetailedPreservationCategory> => {
		const internalBasicView = (await this.getAllInternalBasic()).find(
			(basicView) => basicView.name === name && basicView.isMutable === isMutable
		) as BasicPreservationCategory;

		const preservationTargets: PreservationCategoryPreservationTargetListItem[] = await Promise.all(
			(
				await preservationTargetRepository.getByCategory(name)
			)
				.filter((targetModel) => (targetModel.type === PreservationTargetType.MUTABLE) === isMutable)
				.map(async (targetModel) => {
					const mostRecentBackupExecution = await this.getMostRecentBackupExecutionForPreservationTarget(
						targetModel
					);

					return {
						id: targetModel.id,
						name: targetModel.name,
						fullPath: targetModel.fullPath,
						priorityLabel: targetModel.priorityLabel,
						mostRecentBackup: mostRecentBackupExecution
							? await this.getBackupEtcForBackupExecution(mostRecentBackupExecution)
							: null,
					};
				})
		);

		return {
			name: internalBasicView.name,
			isMutable: internalBasicView.isMutable,
			preservationTargets: preservationTargets,
		};
	};

	private getBackupEtcForBackupExecution = async (exec: BackupExecution): Promise<BackupForEtc> => {
		return {
			id: exec.id,
			updatedTime: exec.updatedTime,
			uploads: (await uploadExecutionRepository.getByBackupExecutionId(exec.id)).map((model) => {
				return {
					id: model.id,
					destination: model.destination,
					destinationPath: model.destinationPath,
					completedTime: model.completedTime,
					status: model.status,
				};
			}),
			sizeBytes: exec.beforeProcessBytes,
			category: exec.category,
		};
	};

	private getMostRecentBackupExecutionForPreservationTarget = async (
		target: PreservationTarget
	): Promise<BackupExecution> => {
		const all = await backupExecutionRepository.getByPreservationTargetId(target.id);
		return all.sort((a, b) => {
			const aTime = a.updatedTime ? a.updatedTime : 0;
			const bTime = b.updatedTime ? b.updatedTime : 0;
			const aa = BigInt(aTime);
			const bb = BigInt(bTime);
			if (bb > aa) {
				return 1;
			} else if (bb < aa) {
				return -1;
			} else {
				return 0;
			}
		})[0];
	};
}

export const preservationCategoryRepository = new PreservationCategoryRepository();

interface InternalBasicPreservationCategory {
	name: string;
	isMutable: boolean;
}

export interface BasicPreservationCategory {
	name: string;
	isMutable: boolean;
	furthestBackUploadCompletedTimeForTargetsMostRecentBackups: string;
	uploadIssues: boolean;
}

export interface DetailedPreservationCategory {
	name: string;
	isMutable: boolean;
	preservationTargets: PreservationCategoryPreservationTargetListItem[];
}

export interface PreservationCategoryPreservationTargetListItem {
	id: number;
	name: string;
	fullPath: string;
	priorityLabel: string;
	mostRecentBackup: BackupForEtc | null;
}

export interface BackupForEtc {
	id: number;
	updatedTime: string;
	uploads: UploadsForEtc[];
	sizeBytes: string;
	category: string;
}

export interface UploadsForEtc {
	id: number;
	destination: string;
	destinationPath: string;
	completedTime: string;
	status: UploadStatus;
}
