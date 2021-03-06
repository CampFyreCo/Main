export const BCRYPT_ROUNDS = 12;
export const USER_FLAGS = {
	STAFF: 1 << 0,
	ADMIN: 1 << 1
} as const;
export const EMAIL = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
// probably not final
export const PASSWORD = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,64}$/;
export const HANDLE = /^[a-z\d_-]{2,16}$/i; // Max 64^16 handles
// this NEEDS to be narrowed
export const NAME = /^.{2,}$/i;

export const SIZE_LIMITS = {
	// 1MB
	ANONYMOUS: 1e6,
	// 10MB
	EMAIL_NOT_VERIFIED: 1e7,
	// 50MB
	EMAIL_VERIFIED: 5e7,
	// 100MB
	INCREASED: 1e8,
	// Infinity
	UNLIMITED: Infinity
} as const;
export const EXTERNAL_LINK_TYPES = [
	"e621",
	"furaffinity",
	"inkbunny",
	"patreon",
	"twitter",
	"deviantart"
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
