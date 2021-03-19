import User from "./User";
import Invite from "./Invite";
import db, { mdb } from "..";
import Snowflake from "../../util/Snowflake";
import Functions from "../../util/Functions";
import { CreateServerOptions, GetServerOptions } from "../../util/@types/Database";
import config from "../../config";
import { SERVER_FEATURES } from "../../util/Constants/General";
import { FilterQuery, FindOneAndUpdateOption, UpdateQuery } from "mongodb";
import { AnyObject, DeepPartial, Nullable, WithoutFunctions } from "@uwu-codes/utils";

export interface ServerMember {
	/** The id of this member */
	id: string;
	/** The nickname of this member, if any */
	nick: string | null;
	// @TODO
	/** The roles this member has */
	roles: Array<string>;
	/** The **id** of the invite this member used, if known */
	inviteUsed: string | null;
	/** the ISO-8601 timestamp this member joined at */
	joinedAt: string;
}
export type ServerProperties = WithoutFunctions<Server>;
export { Server };
export default class Server {
	static DEFAULTS: Nullable<ServerProperties> = {
		id: null,
		features: [],
		name: null,
		owner: null,
		icon: null,
		vanityURL: null,
		members: [],
		invites: [],
		channels: []
	};

	/** the id of the server */
	id: string;
	/** the features this server has */
	features: Array<(typeof SERVER_FEATURES)[number]>;
	/** the name of this server */
	name: string;
	/** the id of the owner of this server */
	owner: string;
	/** The icon of this server */
	icon: string | null;
	/** The vanity url for this server, if any */
	vanityURL: string | null;
	/** The members in this server */
	members: Array<ServerMember>;
	/** The invites associated with this server (id) */
	invites: Array<string>;
	/** The channels associated with this server */
	channels: Array<string>;
	constructor(id: string, data: ServerProperties) {
		this.id = id;
		this.load(data);
	}

	private load(data: ServerProperties) {
		// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		delete (data as any)._id;
		Object.assign(
			this,
			Functions.mergeObjects(
				data,
				Server.DEFAULTS
			)
		);
	}

	async refresh() {
		const r = await db.collection("servers").findOne({ id: this.id });
		if (r === null) throw new TypeError("Unexpected null on refresh");
		this.load.call(this, r);
		return this;
	}

	async mongoEdit<T = ServerProperties>(d: UpdateQuery<T>, opt?: FindOneAndUpdateOption<T>) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const j = await db.collection<T>("servers").findOneAndUpdate({ id: this.id } as any, d, opt);
		await this.refresh();
		return j;
	}

	async edit(data: DeepPartial<ServerProperties>) {
		// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		if ((data as any)._id) delete (data as any)._id;
		await mdb.collection("servers").findOneAndUpdate({
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

	/**
	 * Convert this server object into a JSON representation.
	 *
	 * @param {boolean} [fetch=false] - If we should fetch some entities related to this server.
	 */
	toJSON(fetch: true): Promise<PublicServerFetched>;
	toJSON(fetch?: false): PublicServer;
	toJSON(fetch?: boolean): PublicServer | Promise<PublicServerFetched>;
	toJSON(fetch = false): PublicServer | Promise<PublicServerFetched> {
		const t = Functions.toJSON(
			this,
			[
				"id",
				"features",
				"name",
				"owner",
				"icon"
			],
			[],
			!fetch
		);
		Object.defineProperty(t, "createdAt", {
			value: new Date(Snowflake.decode(this.id).timestamp).toISOString()
		});
		return fetch ? Promise.resolve(async () => ({
			...t as PublicServer
		} as PublicServerFetched)).then((f) => f()) : t as PublicServer;
	}

	static isServer(obj: unknown): obj is Server {
		return obj instanceof Server;
	}
	static async getServer(data: string | FilterQuery<GetServerOptions>) {
		return db.collection("servers").findOne(typeof data === "string" ? { id: data } : (data as AnyObject)).then((d) => d ? new Server(d.id, d) : null);
	}

	static async new(data: CreateServerOptions, addOwner = false, idOverride?: string) {
		// id override should NOT be used in production
		if (config.dev === false && idOverride) throw new TypeError("Server.new#idOverride used in production.");
		const id = idOverride ?? Snowflake.generate();

		return db.collection("servers").insertOne(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			Functions.mergeObjects<any, any>(
				{
					...data,
					id
				},
				this.DEFAULTS
			)
		).then(async ({ ops: [v] }) => {
			const srv = new Server(id, v);
			if (addOwner) await srv.addMember(srv.owner);
			return srv;
		});
	}

	getIdenticon(size?: number) {
		return Functions.getIdenticon(this.id, size);
	}
	iconURL(size?: number, ext?: string) {
		return this.icon === null ? this.getIdenticon(size) : Server.getServerIconURL(this.id, this.icon, size, ext);
	}
	static getServerIconURL(id: string, hash: string, size = 256, ext = "jpg") {
		return `${config.http.web.icon}/${id}/${hash}.${ext}?size=${size}`;
	}

	hasMember(id: string) {
		return this.members.map(m => m.id).includes(id);
	}
	async addMember(user: string | User, inviteUsed?: string, nick?: string, roles?: Array<string>) {
		const d = new Date().toISOString();
		if (!User.isUser(user)) {
			const u = await User.getUser({ id: user });
			if (u === null) throw new TypeError("Invalid user in Server.addMember");
			user = u;
		}
		// we can just assume they will never be out of sync, that's easier
		// than dealing with the possiblitiy of them being out of sync
		if (this.hasMember(user.id)) return false;

		await this.mongoEdit({
			$push: {
				members: {
					id: user.id,
					nick: nick ?? null,
					roles: roles ?? [],
					inviteUsed: inviteUsed ?? null,
					joinedAt: d
				}
			}
		});

		await user.addServer(this.id);

		// @TODO server add event
		// @TODO member add event

		return true;
	}

	// type/reason are for internal use later
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async removeMember(user: string | User, type: "leave" | "kick" | "ban" | "manual", reason?: string) {
		if (!User.isUser(user)) {
			const u = await User.getUser({ id: user });
			if (u === null) throw new TypeError("Invalid user in Server.addMember");
			user = u;
		}
		if (!this.hasMember(user.id)) return false;

		await this.mongoEdit({
			$pull: {
				members: this.members.find(m => m.id === (user as User).id)
			}
		});

		await user.removeServer(this.id);

		// @TODO server remove event
		// @TODO member remove event

		return true;
	}

	async getInvites() {
		return Server.getServerInvites(this);
	}
	static async getServerInvites(data: Server | string) {
		if (!Server.isServer(data)) {
			const s = await Server.getServer({ id: data });
			if (s === null) throw new TypeError("Invalid server in Server.getServerInvites");
			data = s;
		}

		const inv = await Promise.all(data.invites.map(async (id) => Invite.getInvite({ id })));

		return inv;
	}
}

export type PublicServer = Pick<Server, "id" | "name" | "icon" | "owner" | "features"> & { createdAt: string; };
export type PublicServerFetched = PublicServer & { channels: never; };
