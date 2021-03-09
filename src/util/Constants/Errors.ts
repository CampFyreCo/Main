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
	},
	LOGIN_TOKEN_REQUIRED: {
		code: 40005,
		message: "A login token is required to use this."
	},
	MFA_CODE_REQUIRED: {
		code: 40006,
		message: "A mfa code is required."
	},
	LOGIN_TOKEN_INVALID: {
		code: 40007,
		message: "The provided login token is invalid."
	},
	MFA_CODE_INCORRECT: {
		code: 40008,
		message: "The provided mfa code is incorrect."
	}
} as const;

export const USER = {
	UNKNOWN: {
		code: 41000,
		message: "Unknown user."
	},
	INVALID_HANDLE: {
		code: 41001,
		message: "Invalid handle provided."
	},
	HANDLE_IN_USE: {
		code: 41001,
		message: "The handle you provided is in use."
	},
	INVALID_NAME: {
		code: 41002,
		message: "The name you provided is invalid."
	},
	INVALID_EMAIL: {
		code: 41003,
		message: "The email you provided is invalid."
	},
	EMAIL_IN_USE: {
		code: 41004,
		message: "The email you provided is already in use."
	},
	PASSWORD_REQUIRED: {
		code: 41005,
		message: "Missing required field 'password'."
	},
	INVALID_PASSWORD: {
		code: 41006,
		message: "The password you provided is invalid."
	},
	INCORRECT_PASSWORD: {
		code: 41007,
		message: "The password you provided was incorrect."
	},
	NOT_MODIFIED: {
		code: 41008,
		message: "No modifications were found."
	},
	HANDLE_OR_EMAL_REQUIRED: {
		code: 41009,
		message: "A handle or email is required."
	},
	NO_USER_FOUND: {
		code: 41010,
		message: "No user was found with that email or handle."
	},
	NO_PASSWORD: {
		code: 41011,
		message: "That user account does not have a password set."
	},
	HANDLE_REQUIRED: {
		code: 41012,
		message: "A handle is required."
	},
	EMAIL_REQUIRED: {
		code: 41013,
		message: "An email is required."
	},
	INVALID_AVATAR: {
		code: 41014,
		message: "Invalid avatar provided. Make sure it's a base64 encoded image."
	},
	AVATAR_TOO_LARGE: {
		code: 41015,
		message: "The avatar you sent was too large."
	},
	UNKNOWN_FILE_TYPE: {
		code: 41016,
		message: "We were unable to find the type of that file. Try a different file."
	},
	UNSUPPORTED_FILE_TYPE: {
		code: 41017,
		message: "The file type provided is not supported. Try a different type."
	},
	EMAIL_ALREADY_VEIRIFED: {
		code: 41018,
		message: "Your account email is already verified."
	},
	NO_EMAIL: {
		code: 41019,
		message: "This account does not have an email associated with it."
	},
	MISSING_CONNECTION_TYPE: {
		code: 41020,
		message: "A connection type is required."
	},
	MISSING_CONNECTION_VALUE: {
		code: 41021,
		message: "A connection value is required."
	},
	CONNECTION_TYPE_INVALID: {
		code: 41022,
		message: "The connection type \"%TYPE%\" is invalid."
	},
	CONNECTION_LIMIT: {
		code: 41023,
		message: "You have reached the connection limit."
	},
	CONNECTION_TYPE_LIMIT: {
		code: 41024,
		message: "You have hit the limit for connections of that type."
	},
	CONNECTION_ALREADY_LISTED: {
		code: 41025,
		message: "That connection has already been added."
	},
	INVALID_CONNECTION_VISIBILITY: {
		code: 41026,
		message: "The connection visibility \"%VIS%\" is invalid."
	},
	INVALID_CONNECTION_ID: {
		code: 41027,
		message: "The connection id \"%ID%\" is not valid."
	},
	NO_ACCESS_SERVER: {
		code: 41028,
		message: "You do not have access to that server."
	},
	MFA_ALREADY_ENABLED: {
		code: 41029,
		message: "Multi-Factor Authentication is already enabled on your account."
	},
	MFA_NOT_ENABLED: {
		code: 41030,
		message: "Multi-Factor Authentication is not enabled for your account."
	}
} as const;

export const SERVER = {
	UNKNOWN: {
		code: 42000,
		message: "Unknown server."
	},
	OWNER: {
		code: 41001,
		message: "You cannot leave a server you own."
	}
};

export const CLIENT = {
	NOT_FOUND: {
		code: 404,
		message: "The path \"%PATH%\" was not found on this server."
	},
	METHOD_NOT_ALLOWED: {
		code: 405,
		message: "The method \"%METHOD%\" is not allowed on this server."
	},
	RATE_LIMITED: {
		code: 429,
		message: "You're doing that action too fast."
	}
} as const;

// can't be server due to actual servers taking that
export const INTERNAL = {
	UNKNOWN: {
		code: 500,
		message: "An unknown internal server error occured."
	},
	TOO_LARGE: {
		code: 513,
		message: "Whatever you tried to upload was too large. You sent %LENGTH% bytes. Keep it under %MAX% bytes."
	}
} as const;
