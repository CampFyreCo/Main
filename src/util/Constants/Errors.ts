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
		mesage: "No modifications were found."
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
	}
};

export const RATE_LIMITED = {
	code: 429,
	message: "You're doing that action too fast."
};

export const SERVER = {
	UNKNOWN: {
		code: 500,
		message: "An unknown internal server error occured."
	}
};
