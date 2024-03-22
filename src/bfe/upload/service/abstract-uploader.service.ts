export abstract class AbstractUploaderService {
	public abstract onStartUpload(): Promise<void>;

	public abstract onPauseUpload(): Promise<void>;

	public abstract onResumeUpload(): Promise<void>;

	public abstract onRemoveUpload(): Promise<void>;

	public abstract onFinaliseUpload(): Promise<void>;
}
