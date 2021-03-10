import ConnectionsHandler from "../handlers/ConnectionsHandler";
import { Encoding } from "speakeasy";

export const BCRYPT_ROUNDS = 12;
export const USER_FLAGS = {
	STAFF: 1 << 0,
	VERIFIED: 1 << 1,
	SYSTEM: 1 << 2
} as const;
// I wanted to do flags, but that runs out after ~30, which we could easily get to eventually,
// so we're being prepared for the future
export const SERVER_FEATURES = [
	"OFFICIAL",
	"VERIFIED",
	"PARTNERED",
	"VANITY_URL"
] as const;
// eslint-disable-next-line no-control-regex
export const EMAIL = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
// probably not final
export const PASSWORD = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,64}$/;
export const HANDLE = /^[a-z\d_-]{2,16}$/i; // Max 64^16 handles
// this NEEDS to be narrowed
export const NAME = /^.{2,}$/i;
// 5 Megabytes, ~2048x2048
export const MAX_AVATAR_SIZE = 5e+6;
export const MIN_IMAGE_SIZE = 16;
export const MAX_IMAGE_SIZE = 2048;
export const ALLOWED_METHODS = [
	"GET",
	"POST",
	"PATCH",
	"PUT",
	"DELETE",
	"HEAD",
	"OPTIONS"
] as const;
export const Colors = {
	gold: 0xFFD700,
	orange: 0xFFA500,
	red: 0xDC143C,
	green: 0x008000,
	white: 0xFFFFFF,
	black: 0x000000,
	brown: 0x8B4513,
	pink: 0xFFC0CB,
	hotPink: 0xFF69B4,
	deepPink: 0xFF1493,
	violet: 0xEE82EE,
	magenta: 0xFF00FF,
	darkViolet: 0x9400D3,
	purple: 0x800080,
	indigo: 0x4B0082,
	maroon: 0x800000,
	cyan: 0x00FFFF,
	teal: 0x008080,
	blue: 0x0000FF,
	get random() {
		return Math.floor(Math.random() * 0xFFFFFF);
	}
};
export type ConnectionProperty = "noVerification" | "verificationRequired" | "noLink";

export interface Connection {
	url: string | null;
	name: string;
	properties: Array<ConnectionProperty>;
	validationRegex: RegExp;
}

/* start user connections*/
export const CONNECTIONS = ConnectionsHandler.VALID;
export const MAX_SAMESITE_CONNECTIONS = 3;
export const MAX_CONNECTIONS = 15;

/* other */
export const APP_NAME = "Camp Fyre";

/* 2fa */
export const MFA_NAME = APP_NAME;
export const MFA_ISSUER = APP_NAME;
export const MFA_LENGTH = 16;
export const MFA_ENCODING = "base32" as Encoding;
export const MFA_STEP = 30;
export const MFA_WINDOW = 2;
export const MFA_LOGIN_TOKEN_EXPIRY = 60;
export const MFA_BACKUP_REGEX = /^[\da-f]{6}-[\da-f]{6}-[\da-f]{6}$/i;
export const MFA_BACKUP_COUNT = 5;

export const INVITE_KEYSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const INVITE_LENGTH = 7;
