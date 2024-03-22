let applicationConfig: ApplicationConfig;

export const setApplicationConfig = (env: NodeJS.ProcessEnv): void => {
	if (applicationConfig) {
		throw new Error("Application config has already been set");
	}
	applicationConfig = {
		port: parseInt(env.PORT as string, 10),
		appTmp: env.APP_TMP ? env.APP_TMP : "",
		tarsplitterBinPath: env.TARSPLITTER_BIN_PATH ? env.TARSPLITTER_BIN_PATH : "",
		blocksPerTarsplitterSplit: parseInt(env.BLOCKS_PER_TARSPLITTER_SPLIT as string, 10),
		maxSubarchiveSizeBytes: parseInt(env.MAX_SUBARCHIVE_SIZE_BYTES as string, 10),
		rcloneBwlimit: env.RCLONE_BWLIMIT ? env.RCLONE_BWLIMIT : "1M",
		defaultUploadDestination: env.DEFAULT_UPLOAD_DESTINATION ? env.DEFAULT_UPLOAD_DESTINATION : "",
		defaultUploadDestinationPath: env.DEFAULT_UPLOAD_DESTINATION_PATH
			? env.DEFAULT_UPLOAD_DESTINATION_PATH
			: "",
		rcloneConfPath: env.RCLONE_CONF_PATH ? env.RCLONE_CONF_PATH : "",
	};
};

export const getApplicationConfig = (): ApplicationConfig => {
	if (!applicationConfig) {
		throw new Error("Application config has not been set yet");
	}
	return applicationConfig;
};

export interface ApplicationConfig {
	readonly port: number;
	readonly appTmp: string;
	readonly tarsplitterBinPath: string;
	readonly blocksPerTarsplitterSplit: number;
	readonly maxSubarchiveSizeBytes: number;
	readonly rcloneBwlimit: string;
	readonly defaultUploadDestination: string;
	readonly defaultUploadDestinationPath: string;
	readonly rcloneConfPath: string;
}
