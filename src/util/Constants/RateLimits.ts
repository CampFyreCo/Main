export type RateLimit = [limit: number, time: number];
export type RateLimitTypes = Exclude<keyof typeof RateLimits, "prototype">;

export default class RateLimits {
	static GET_USER = [10, 20] as RateLimit;
	static GET_SELF_USER = [2, 10] as RateLimit;
	static EDIT_SELF_USER = [5, 30] as RateLimit;
	static CONFIRM_EMAIL = [2, 10] as RateLimit;
	static CONFIRM_EMAIL_START = [3, 3600] as RateLimit;
	static ADD_CONNECTION = [5, 60] as RateLimit;
	static REMOVE_CONNECTION = [5, 60] as RateLimit;
	static GET_SERVER = [5, 30] as RateLimit;
	static EDIT_SERVER = [5, 30] as RateLimit;
}
