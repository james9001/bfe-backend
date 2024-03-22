import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import actuator from "express-actuator";
import { errorHandler } from "./misc/error.middleware";
import { notFoundHandler } from "./misc/not-found.middleware";
import { metricsRouter } from "./misc/metrics.router";
import { getApplicationConfig, setApplicationConfig } from "./misc/application-config.singleton";
import { applicationStateRepository } from "./bfe/common/repository/application-state.repository";
import { commonMainService } from "./bfe/common/common.main.service";
import { uploadExecutionRouter } from "./bfe/upload/router/upload-execution.router";
import { restorationSecretRouter } from "./bfe/restoration/router/restoration-secret.router";
import { restorationRouter } from "./bfe/restoration/router/restoration-execution.router";
import { preservationTargetRouter } from "./bfe/backup/router/preservation-target.router";
import { backupSecretRouter } from "./bfe/backup/router/backup-secret.router";
import { backupRouter } from "./bfe/backup/router/backup-execution.router";
import { applicationStateRouter } from "./bfe/common/router/application-state.router";
import { executionRouter } from "./bfe/common/router/execution.router";
import { uploadDebugRouter } from "./bfe/upload/router/upload.debug.router";
import { applicationStateDebugRouter } from "./bfe/common/router/application-state.debug.router";
import { restorationDebugRouter } from "./bfe/restoration/router/restoration.debug.router";
import { backupDebugRouter } from "./bfe/backup/router/backup.debug.router";
import { applicationSettingsRepository } from "./bfe/common/repository/application-settings.repository";
import { applicationSettingsRouter } from "./bfe/common/router/application-settings.router";
import { queuedBackupExecutionRouter } from "./bfe/automaticmode/router/queued-backup-execution.router";
import { automaticModeTogglerRouter } from "./bfe/automaticmode/router/automatic-mode-toggler.router";
import { batchExecutionRouter } from "./bfe/automaticmode/router/batch-execution.router";
import { automaticModeMainService } from "./bfe/automaticmode/automaticmode.main.service";
import { backupExecutionViewRouter } from "./bfe/backup/router/backup-execution-view.router";
import { preservationCategoryRouter } from "./bfe/backup/router/preservation-category.router";
import { preservationTargetAutoCreatorRouter } from "./bfe/backup/router/preservation-target-auto-creator.router";

dotenv.config();

if (!process.env.PORT) {
	process.exit(1);
}

setApplicationConfig(process.env);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
	actuator({
		basePath: "/api/actuator",
	})
);
app.use("/api/debug/backup", backupDebugRouter);
app.use("/api/debug/restoration", restorationDebugRouter);
app.use("/api/debug/state", applicationStateDebugRouter);
app.use("/api/debug/upload", uploadDebugRouter);

app.use("/api/execution", executionRouter);
app.use("/api/execution/batch", batchExecutionRouter);

app.use("/api/data/state", applicationStateRouter);
app.use("/api/data/settings", applicationSettingsRouter);
app.use("/api/data/backup", backupRouter);
app.use("/api/data/backup-secret", backupSecretRouter);
app.use("/api/data/preservation-target", preservationTargetRouter);
app.use("/api/data/preservation-target-auto-creator", preservationTargetAutoCreatorRouter);
app.use("/api/data/restoration", restorationRouter);
app.use("/api/data/restoration-secret", restorationSecretRouter);
app.use("/api/data/upload", uploadExecutionRouter);
app.use("/api/data/queued-backup-execution", queuedBackupExecutionRouter);

app.use("/api/automatic-mode", automaticModeTogglerRouter);

//"View Data" prototype
app.use("/api/data/view/backup", backupExecutionViewRouter);

//New screens
app.use("/api/view/category", preservationCategoryRouter);

app.use("/api/metrics", metricsRouter);

app.use(errorHandler);
app.use(notFoundHandler);

void applicationStateRepository.onApplicationStart().then(async () => {
	await applicationSettingsRepository.onApplicationStart();
	await commonMainService.onApplicationStartRealignState();
	await automaticModeMainService.onApplicationStart();
	const port = getApplicationConfig().port;
	app.listen(port, () => {
		console.log(`Listening on port ${port}`);
	});
});
