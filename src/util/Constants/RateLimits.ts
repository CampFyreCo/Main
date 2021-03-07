type RateLimit = [limit: number, time: number];
export default class Ratelimits {
	static GET_USER = [10, 2e4] as RateLimit;
	static GET_SELF_USER = [2, 1e4] as RateLimit;
	static EDIT_SELF_USER = [5, 3e4] as RateLimit;
}
