export const AUTHORIZATION = {
	MISSING: {
		code: 40000,
		message: "Missing authorization."
	},
	INVALID: {
		code: 40001,
		message: "Invalid authorization"
	},
	UNKNOWN_SCHEME: {
		code: 40002,
		message: "Unrecognized authorization scheme."
	},
	BADLY_FORMED: {
		code: 40003,
		message: "Badly formed authorization."
	},
	INVALID_USER: {
		code: 40004,
		message: "Invalid user in authorization."
	}
};

export const USER = {
	UNKNOWN: {
		code: 41000,
		message: "Unknown user."
	}
};

export const RATE_LIMITED = {
	code: 429,
	message: "You're doing that action too fast."
};
