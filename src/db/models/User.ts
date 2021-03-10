import db, { mdb, Redis } from "..";
import { BCRYPT_ROUNDS, CONNECTIONS, MFA_BACKUP_COUNT, MFA_BACKUP_REGEX, MFA_LOGIN_TOKEN_EXPIRY, MFA_STEP, MFA_WINDOW } from "../../util/Constants/General";
import Snowflake from "../../util/Snowflake";
import Functions from "../../util/Functions";
import { CreateUserOptions, GetUserOptions } from "../../util/@types/Database";
import config from "../../config";
import UserAgent, { IBrowser } from "ua-parser-js";
import bcrypt from "bcrypt";
import { FilterQuery, FindOneAndUpdateOption, UpdateQuery } from "mongodb";
import { AnyObject, DeepPartial, Nullable, WithoutFunctions } from "@uwu-codes/utils";
import crypto from "crypto";

export type UserProperties = WithoutFunctions<User>;
export { User };
export default class User {
	static DEFAULTS: Nullable<UserProperties> = {
		id: null,
		flags: 0,
		handle: null,
		email: null,
		name: null,
		bot: false,
		avatar: null,
		password: null,
		emailVerified: false,
		connections: [],
		authTokens: [],
		servers: [],
		mfaEnabled: false,
		mfaVerified: false,
		mfaSecret: null,
		mfaBackupCodes: [],
		handleLocked: false
	};

	/** the id of the user */
	id: string;
	/** the account flags this user has */
	flags: number;
	/** the handle of this user */
	handle: string;
	/** the email of this user */
	email: string | null;
	/** the (user)name of this user */
	name: string;
	// I was considering making this a flag, but making it a property makes things easier
	/** If this user is a bot account */
	bot: boolean;
	/** the avatar of this user */
	avatar: string | null;
	/** the bcrypt hashed password of this user*/
	password: string | null;
	/** if the user has verified the email on their account */
	emailVerified: boolean;
	/** The external services this user has linked on their account */
	connections: Array<{
		/** The id of this connection */
		id: string;
		/** The type of this connection */
		type: typeof CONNECTIONS[number];
		/** The visibility of this connection */
		visibility: "private" | "friends" | "public";
		/** If this connection has been verified to belong to them */
		verified: boolean;
		/** The value (name/handle) of this connection */
		value: string;
	}>;
	/** The authentication tokens for this account */
	authTokens: Array<{
		/** The ip this token was created from */
		ip: string;
		/** The token that was used to create this token */
		userAgent: string | undefined;
		/** The token itself */
		token: string;
		/** The creation date of this token */
		creation: string;
		/** The device this token was made from */
		device: {
			/** The browser this token was made from */
			browser: Omit<IBrowser, "major">;
			/** The type of the device this token was made from */
			type: string;
			/** The name of the device this token was made from  */
			name: string;
		} | undefined;
	}>;
	/** The servers this user is in */
	servers: Array<string>;
	/** If this user has mfa enabled on their account */
	mfaEnabled: boolean;
	/** If the mfa enabled on this account is verified */
	mfaVerified: boolean;
	/** The secret for this account's mfa, if enabled */
	mfaSecret: string | null;
	/** The backup codes for this account */
	mfaBackupCodes: Array<{
		code: string;
		used: boolean;
	}>;
	/** If this user cannot change their handle */
	handleLocked: boolean;
	constructor(id: string, data: UserProperties) {
		this.id = id;
		this.load(data);
	}

	private load(data: UserProperties) {
		// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		delete (data as any)._id;
		Object.assign(
			this,
			Functions.mergeObjects(
				data,
				User.DEFAULTS
			)
		);
	}

	async refresh() {
		const r = await db.collection("users").findOne({ id: this.id });
		if (r === null) throw new TypeError("Unexpected null on refresh");
		this.load.call(this, r);
		return this;
	}

	async mongoEdit<T = UserProperties>(d: UpdateQuery<T>, opt?: FindOneAndUpdateOption<T>) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const j = await db.collection<T>("users").findOneAndUpdate({ id: this.id } as any, d, opt);
		await this.refresh();
		return j;
	}

	async edit(data: DeepPartial<UserProperties>) {
		// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		if ((data as any)._id) delete (data as any)._id;
		await mdb.collection("users").findOneAndUpdate({
			id: this.id
		}, {
			$set: Functions.mergeObjects(
				data,
				this
			)
		});

		return this.refresh();
	}

	decodeId() {
		return Snowflake.decode(this.id);
	}

	checkPassword(pwd: string) {
		if (this.password === null) return false;
		return bcrypt.compareSync(pwd, this.password);
	}

	setPassword(pwd: string) {
		return this.edit({
			password: bcrypt.hashSync(pwd, BCRYPT_ROUNDS)
		});
	}

	async createAuthToken(ip: string, userAgent?: string/* , override?: string */) {
		/* if (config.dev === false && override) throw new TypeError("User.createAuthToken override used in production"); */
		const token = /* override ??  */crypto.randomBytes(32).toString("hex");
		let d: User["authTokens"][number]["device"];
		if (userAgent !== undefined) {
			const { browser, os, device } = new UserAgent(userAgent).getResult();
			// we don't need this
			// eslint-disable-next-line deprecation/deprecation
			delete browser.major;
			d = {
				browser,
				type: device.type ?? "desktop",
				name: os.name ?? "Unknown"
			};
		}
		await this.mongoEdit({
			$push: {
				authTokens: {
					ip,
					userAgent,
					token,
					creation: new Date().toISOString(),
					device: d
				}
			}
		});
		return token;
	}

	async deleteAuthToken(token: string) {
		if (this.authTokens.find(({ token: t }) => t === token) === undefined) return false;
		await this.mongoEdit({
			$pull: {
				authTokens: this.authTokens.find(({ token: t }) => t === token)
			}
		});
		return true;
	}

	async deleteAllTokens() {
		if (this.authTokens.length === 0) return false;
		await this.mongoEdit({
			$set: {
				authTokens: []
			}
		});
		return true;
	}

	async getAuth(t: string) {
		// padding isn't REQUIRED, so we remove it so we don't have to encode & decode later
		return Buffer.from(`${this.handle}:${t}`, "ascii").toString("base64").replace(/=/g, "");
	}

	/**
	 * Convert this user object into a JSON representation.
	 *
	 * @param {boolean} [privateProps=false] - If we should return more private properties.
	 */
	toJSON(privateProps: true): PrivateUser & { createdAt: string; };
	toJSON(privateProps?: false): PublicUser & { createdAt: string; };
	toJSON(privateProps?: boolean): (PrivateUser | PublicUser) & { createdAt: string; };
	toJSON(privateProps = false) {
		const t = Functions.toJSON(
			this,
			[
				"id",
				"avatar",
				"flags",
				"handle",
				"name"
			],
			[
				"email",
				"emailVerified",
				"connections",
				"mfaEnabled",
				"mfaVerified"
			],
			privateProps
		);
		Object.defineProperty(t, "createdAt", {
			value: new Date(Snowflake.decode(this.id).timestamp).toISOString()
		});
		return t as typeof t & { createdAt: string; };
	}

	getFlags() {
		return User.getUserFlags(this);
	}
	static getUserFlags({ flags }: User) {
		return Functions.calcUserFlags(flags);
	}

	static isUser(obj: unknown): obj is User {
		return obj instanceof User;
	}
	static async getUser(data: string | FilterQuery<GetUserOptions>) {
		return db.collection("users").findOne(typeof data === "string" ? { id: data } : (data as AnyObject)).then((d) => d ? new User(d.id, d) : null);
	}

	static async new(data: CreateUserOptions, idOverride?: string) {
		// id override should NOT be used in production
		if (config.dev === false && idOverride) throw new TypeError("id override used in production.");
		const id = idOverride ?? Snowflake.generate();

		return db.collection("users").insertOne(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			Functions.mergeObjects<any, any>(
				{
					...data,
					id
				},
				this.DEFAULTS
			)
		).then(({ ops: [v] }) => new User(id, v));
	}

	getIdenticon(size?: number) {
		return Functions.getIdenticon(this.email ?? this.id, size);
	}
	avatarURL(size?: number, ext?: string) {
		return this.avatar === null ? this.getIdenticon(size) : User.getUserAvatarUrl(this.id, this.avatar, size, ext);
	}
	static getUserAvatarUrl(id: string, hash: string, size = 256, ext = "jpg") {
		return `${config.http.web.avatar}/${id}/${hash}.${ext}?size=${size}`;
	}

	async addConnection<T extends User["connections"][number]>(type: T["type"], value: T["value"], visibility: T["visibility"]) {
		const id = Snowflake.generate();
		const con = {
			id,
			type,
			visibility,
			verified: false,
			value
		};
		await this.mongoEdit({
			$push: {
				connections: con
			}
		});

		return con;
	}

	async removeConnection(id: string) {
		if (!this.connections.map(c => c.id).includes(id)) return false;
		await this.mongoEdit({
			$pull: {
				connections: this.connections.find(c => c.id === id)
			}
		});
		return true;
	}

	inServer(id: string) {
		return this.servers.includes(id);
	}

	async addServer(id: string) {
		if (this.inServer(id)) return false;
		await this.mongoEdit({
			$push: {
				servers: id
			}
		});

		return true;
	}

	async removeServer(id: string) {
		if (!this.inServer(id)) return false;
		await this.mongoEdit({
			$pull: {
				servers: id
			}
		});

		return true;
	}

	async enableMFA() {
		if (this.mfaEnabled === true) return null;
		const { secret, qr } = await Functions.newMFA();
		const b = await this.resetBackupCodes();
		await this.edit({
			mfaEnabled: true,
			mfaVerified: false,
			mfaSecret: secret
		});
		return { secret, qr, backupCodes: b };
	}

	async verifyMFA(token: string) {
		if (this.mfaEnabled === false || this.mfaSecret === null) return false;
		if (MFA_BACKUP_REGEX.test(token)) {
			if (this.mfaBackupCodes.map(({ code }) => code).includes(token.toLowerCase())) {
				const b = this.mfaBackupCodes;
				if (b.find(({ code }) => code === token.toLowerCase())!.used) return false;
				b.find(({ code }) => code === token.toLowerCase())!.used = true;
				await this.mongoEdit({
					$set: {
						mfaBackupCodes: b
					}
				});
				return true;
			}
		} else {
			const ver = Functions.verifyMFA(this.mfaSecret, token);
			if (ver === true) {
				// we don't need to check already used codes if we're doing first time verification
				if (this.mfaVerified === false) await this.edit({
					mfaVerified: true
				});
				else {
					const chk = await Redis.get(`MFA_USED:${this.id}`);
					if (chk === token) return false;
					await Redis.setex(`MFA_USED:${this.id}`, MFA_STEP * MFA_WINDOW, token);
				}
				return true;
			}
		}
		return false;
	}

	async createMFALoginToken(ip: string) {
		const t = crypto.randomBytes(32).toString("hex");
		await Redis.setex(`MFA:LOGIN:${t}`, MFA_LOGIN_TOKEN_EXPIRY, JSON.stringify({ ip, user: this.id }));
		return t;
	}

	static async useMFALoginToken(ip: string, token: string) {
		const r = await Redis.get(`MFA:LOGIN:${token}`);
		if (r === null) return null;
		let v: { ip: string; user: string; };
		try {
			v = JSON.parse(r) as typeof v;
		} catch (e) {
			return null;
		}
		if (v === null) return null;
		if (v.ip !== ip) {
			// @TODO notify about change of ip in login
			return null;
		}
		await Redis.del(`MFA:LOGIN:${token}`);
		return v.user;
	}

	async resetBackupCodes() {
		const b: User["mfaBackupCodes"] = [];
		for (let i = 0; i < MFA_BACKUP_COUNT; i++) b.push({ code: User.genBackupCode(), used: false });
		await this.mongoEdit({
			$set: {
				mfaBackupCodes: b
			}
		});

		return b;
	}

	static genBackupCode() {
		// 6-6-6, 20 characters total
		return `${crypto.randomBytes(3).toString("hex")}-${crypto.randomBytes(3).toString("hex")}-${crypto.randomBytes(3).toString("hex")}`;
	}
}

export type PublicUser = Pick<User, "id" | "avatar" | "flags" | "handle" | "name">;
export type PrivateUser = Pick<User, keyof PublicUser | "email" | "emailVerified" | "connections" | "mfaEnabled" | "mfaVerified">;
