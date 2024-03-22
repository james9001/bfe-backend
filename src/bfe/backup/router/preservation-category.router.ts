import express, { Request, Response } from "express";
import { preservationCategoryRepository } from "../repository/preservation-category.repository";

export const preservationCategoryRouter = express.Router();

preservationCategoryRouter.get("/basic", async (req: Request, resp: Response) => {
	const items = await preservationCategoryRepository.getAllBasic();
	resp.status(200).send(items);
});

preservationCategoryRouter.get("/detail/mutable/:name", async (req: Request, resp: Response) => {
	const item = await preservationCategoryRepository.getDetail(req.params.name, true);
	resp.status(200).send(item);
});

preservationCategoryRouter.get("/detail/immutable/:name", async (req: Request, resp: Response) => {
	const item = await preservationCategoryRepository.getDetail(req.params.name, false);
	resp.status(200).send(item);
});
