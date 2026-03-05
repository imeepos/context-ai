declare module "proper-lockfile" {
	export interface LockOptions {
		realpath?: boolean;
		retries?: number | { retries?: number };
	}

	export type ReleaseFn = () => void;

	export interface ProperLockfile {
		lockSync(path: string, options?: LockOptions): ReleaseFn;
	}

	const lockfile: ProperLockfile;
	export default lockfile;
}
