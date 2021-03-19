import { Server } from ".";
import { PublicServer } from "./Server";
import db, { mdb } from "..";
import Snowflake from "../../util/Snowflake";
import Functions from "../../util/Functions";
import { CreateInviteOptions, GetInviteOptions } from "../../util/@types/Database";
import { INVITE_KEYSET, INVITE_LENGTH } from "../../util/Constants/General";
import { FilterQuery, FindOneAndUpdateOption, UpdateQuery } from "mongodb";
import { AnyObject, DeepPartial, Nullable, WithoutFunctions } from "@uwu-codes/utils";

export type InviteProperties = WithoutFunctions<Invite>;
export { Invite };
export default class Invite {
	static DEFAULTS: Nullable<InviteProperties> = {
		id: null,
		code: null,
		creator: null,
		totalUses: 0,
		maxUses: 0,
		expire: null,
		serverId: null
	};

	/** the id of the invite */
	id: string;
	/** the code of the invite  */
	code: string;
	/** the creator of the invite */
	creator: string;
	totalUses: number;
	maxUses: number;
	expire: number | null;
	serverId: string;
	constructor(id: string, data: InviteProperties) {
		this.id = id;
		this.load(data);
	}

	private load(data: InviteProperties) {
		// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		delete (data as any)._id;
		Object.assign(
			this,
			Functions.mergeObjects(
				data,
				Invite.DEFAULTS
			)
		);
	}

	async refresh() {
		const r = await db.collection("invites").findOne({ id: this.id });
		if (r === null) throw new TypeError("Unexpected null on refresh");
		this.load.call(this, r);
		return this;
	}

	async mongoEdit<T = InviteProperties>(d: UpdateQuery<T>, opt?: FindOneAndUpdateOption<T>) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const j = await db.collection<T>("invites").findOneAndUpdate({ id: this.id } as any, d, opt);
		await this.refresh();
		return j;
	}

	async edit(data: DeepPartial<InviteProperties>) {
		// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		if ((data as any)._id) delete (data as any)._id;
		await mdb.collection("invites").findOneAndUpdate({
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
	 * Convert this invite object into a JSON representation.
	 *
	 * @param {boolean} [fetch=false] - If we should fetch some entities related to this invite.
	 */
	toJSON(fetch: true): Promise<PublicInviteFetched>;
	toJSON(fetch?: false): PublicInvite;
	toJSON(fetch?: boolean): PublicInvite | Promise<PublicInviteFetched>;
	toJSON(fetch = false): PublicInvite | Promise<PublicInviteFetched> {
		const t = Functions.toJSON(
			this,
			[
				"id",
				"code",
				"creator",
				"totalUses",
				"maxUses",
				"expire"
			],
			[
				"serverId"
			],
			!fetch
		);
		Object.defineProperty(t, "createdAt", {
			value: new Date(Snowflake.decode(this.id).timestamp).toISOString()
		});

		return fetch ? Promise.resolve(async () => {
			const srv = await this.getServer();
			return {
				...t as PublicInvite,
				server: srv!.toJSON()
			} as PublicInviteFetched;
		}).then((f) => f()) : t as PublicInvite;

	}

	async getServer() {
		return Server.getServer({ id: this.serverId });
	}

	static isInvite(obj: unknown): obj is Invite {
		return obj instanceof Invite;
	}
	static async getInvite(data: string | FilterQuery<GetInviteOptions>) {
		return db.collection("invites").findOne(typeof data === "string" ? { id: data } : (data as AnyObject)).then((d) => d ? new Invite(d.id, d) : null);
	}

	static async new(data: CreateInviteOptions, server: Server | string, codeOverride?: string) {
		if (!Server.isServer(server)) {
			const s = await Server.getServer({ id: server });
			if (s === null) throw new TypeError("Invalid server in Invite.new");
			server = s;
		}

		// code override WILL be used in production for vanity urls
		const id = Snowflake.generate();
		const code = codeOverride ?? Invite.getCode();

		return db.collection("invites").insertOne(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			Functions.mergeObjects<any, any>(
				{
					...data,
					code,
					id,
					serverId: server.id
				},
				this.DEFAULTS
			)
		).then(async ({ ops: [v] }) => {
			// it should be reduced to this already, but it isn't?
			await (server as Server).mongoEdit({
				$push: {
					invites: id
				}
			});
			return new Invite(id, v);
		});
	}

	static getCode(len = INVITE_LENGTH) {
		let code = "";
		for (let i = 0; i < len; i++) code += INVITE_KEYSET[Math.floor(Math.random() * INVITE_KEYSET.length)];
		return code;
	}
}

export type PublicInvite = Pick<Invite, "id" | "code" | "creator" | "totalUses" | "maxUses" | "expire" | "serverId"> & { createdAt: string; };
export type PublicInviteFetched = Omit<PublicInvite, "serverId"> & { server: PublicServer; };
