type RateLimit = [limit: number, time: number];
export default class Ratelimits {
	static GET_USER = [10, 2e4] as RateLimit;
	static GET_SELF_USER = [2, 1e4] as RateLimit;
	static EDIT_SELF_USER = [5, 3e4] as RateLimit;
	static CONFIRM_EMAIL = [2, 1e4] as RateLimit;
	static CONFIRM_EMAIL_START = [3, 3.6e+6] as RateLimit;
	static ADD_CONNECTION = [5, 6e4] as RateLimit;
	static REMOVE_CONNECTION = [5, 6e4] as RateLimit;
}
