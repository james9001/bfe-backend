import express, { Request, Response } from "express";
import { EntityView, SearchResponse, ViewRouterInternal } from "../../common/common.interface";
import { DirectoryChecksum } from "../../common/service/checksum.service";
import { uploadExecutionRepository } from "../../upload/repository/upload-execution.repository";
import {
	BackupExecution,
	backupExecutionRepository,
	BackupExecutionSearchCriteria,
} from "../repository/backup-execution.repository";
require("express-async-errors");

export const backupExecutionViewRouter = express.Router();

backupExecutionViewRouter.post("/execution", async (req: Request, resp: Response) => {
	const item: BackupExecutionView = await routerInternal.postCreate(req);
	resp.status(200).send(item);
});

backupExecutionViewRouter.put("/execution", async (req: Request, resp: Response) => {
	await routerInternal.put(req);
	resp.status(200).send();
});

backupExecutionViewRouter.delete("/execution/:id", async (req: Request, resp: Response) => {
	await routerInternal.delete(req);
	resp.status(200).send();
});

backupExecutionViewRouter.get("/execution", async (req: Request, resp: Response) => {
	const views: BackupExecutionView[] = await routerInternal.getAll();
	resp.status(200).send(views);
});

backupExecutionViewRouter.post("/search", async (req: Request, resp: Response) => {
	const response: SearchResponse<BackupExecutionView> = await routerInternal.postSearch(req);
	resp.status(200).send(response);
});

backupExecutionViewRouter.get("/execution/:id", async (req: Request, resp: Response) => {
	const view: BackupExecutionView = await routerInternal.get(req);
	resp.status(200).send(view);
});

class BackupExecutionViewRouterInternal implements ViewRouterInternal {
	public postCreate = async (req: Request): Promise<BackupExecutionView> => {
		const newItem = new BackupExecution();
		newItem.preservationTargetId = parseInt(req.body.preservationTargetId);
		newItem.artefactName = req.body.artefactName;
		newItem.category = req.body.category;
		newItem.checksum = { checksumValue: req.body.checksum.checksumValue };
		const item = await backupExecutionRepository.create(newItem);
		return await this.transformModelToView(item);
	};

	public put = async (req: Request): Promise<void> => {
		const updateItem = await backupExecutionRepository.getById(parseInt(req.body.id));
		updateItem.preservationTargetId = parseInt(req.body.preservationTargetId);
		updateItem.artefactName = req.body.artefactName;
		updateItem.category = req.body.category;
		updateItem.checksum = { checksumValue: req.body.checksum.checksumValue };
		await backupExecutionRepository.update(updateItem);
	};

	public delete = async (req: Request): Promise<void> => {
		await backupExecutionRepository.deletee(parseInt(req.params.id));
	};

	public getAll = async (): Promise<BackupExecutionView[]> => {
		const models = await backupExecutionRepository.getAll();
		const views = await Promise.all(
			models.map(async (model) => await this.transformModelToView(model))
		);
		return views;
	};

	public get = async (req: Request): Promise<BackupExecutionView> => {
		const model = await backupExecutionRepository.getById(parseInt(req.params.id));
		const view = await this.transformModelToView(model);
		return view;
	};

	public postSearch = async (req: Request): Promise<SearchResponse<BackupExecutionView>> => {
		const criteria = req.body as BackupExecutionSearchCriteria;

		const views = await Promise.all(
			(
				await backupExecutionRepository.search(criteria)
			).map(async (model) => await this.transformModelToView(model))
		);
		const count = await backupExecutionRepository.count(criteria);

		const response: SearchResponse<BackupExecutionView> = {
			data: views,
			page: {
				pageSize: criteria.pageSize,
				totalElements: count,
				pageNumber: criteria.pageNumber,
			},
		};
		return response;
	};

	public transformModelToView = async (model: BackupExecution): Promise<BackupExecutionView> => {
		return {
			id: model.id,
			preservationTargetId: model.preservationTargetId,
			artefactName: model.artefactName,
			category: model.category,
			checksum: model.checksum,
			createdTime: model.createdTime,
			updatedTime: model.updatedTime,
			beforeProcessBytes: model.beforeProcessBytes,
			afterProcessBytes: model.afterProcessBytes,
			uploadExecutionCount: (await uploadExecutionRepository.getByBackupExecutionId(model.id)).length,
		};
	};
}

const routerInternal = new BackupExecutionViewRouterInternal();

interface BackupExecutionView extends EntityView {
	id: number;
	preservationTargetId: number;
	artefactName: string;
	category: string;
	checksum: DirectoryChecksum;
	createdTime: string;
	updatedTime: string;
	beforeProcessBytes: string;
	afterProcessBytes: string;
	uploadExecutionCount: number;
}
