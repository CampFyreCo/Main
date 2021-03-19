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
	static CREATE_SERVER = [2, 300] as RateLimit;
	static GET_SERVER = [5, 30] as RateLimit;
	static EDIT_SERVER = [5, 30] as RateLimit;
	static DELETE_SERVER = [2, 60] as RateLimit;
	static GET_SERVER_INVITES = [3, 30] as RateLimit;
	static USER_LOGIN = [3, 30] as RateLimit;
	static USER_LOGIN_MFA = [3, 30] as RateLimit;
	static USER_REGISTER = [2, 30] as RateLimit;
	static GET_SELF_SERVERS = [2, 15] as RateLimit;
	static LEAVE_SERVER = [5, 30] as RateLimit;
	static ENABLE_MFA = [3, 120] as RateLimit;
	static DISABLE_MFA = [3, 120] as RateLimit;
	static VERIFY_MFA = [3, 120] as RateLimit;
	static GET_BACKUP_CODES = [2, 120] as RateLimit;
	static RESET_BACKUP_CODES = [2, 120] as RateLimit;
	static GET_INVITE = [5, 30] as RateLimit;
	static USE_INVITE = [3, 60] as RateLimit;
}
