import { Server } from ".";
import { PublicServer } from "./Server";
import db, { mdb } from "..";
import Snowflake from "../../util/Snowflake";
import Functions from "../../util/Functions";
import { CreateChannelOptions, GetChannelOptions } from "../../util/@types/Database";
import { CHANNEL_TYPES } from "../../util/Constants/General";
import config from "../../config";
import { FilterQuery, FindOneAndUpdateOption, UpdateQuery } from "mongodb";
import { AnyObject, DeepPartial, Nullable, WithoutFunctions } from "@uwu-codes/utils";

// @TODO permissions
export type ChannelProperties = WithoutFunctions<Channel>;
export { Channel };
export default class Channel {
	static DEFAULTS: Nullable<ChannelProperties> = {
		id: null,
		name: null,
		topic: null,
		serverId: null,
		type: CHANNEL_TYPES.TEXT
	};

	/** the id of the channel */
	id: string;
	name: string;
	topic: string | null;
	serverId: string;
	type: typeof CHANNEL_TYPES[keyof typeof CHANNEL_TYPES];
	constructor(id: string, data: ChannelProperties) {
		this.id = id;
		this.load(data);
	}

	private load(data: ChannelProperties) {
		// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		delete (data as any)._id;
		Object.assign(
			this,
			Functions.mergeObjects(
				data,
				Channel.DEFAULTS
			)
		);
	}

	async refresh() {
		const r = await db.collection("channels").findOne({ id: this.id });
		if (r === null) throw new TypeError("Unexpected null on refresh");
		this.load.call(this, r);
		return this;
	}

	async mongoEdit<T = ChannelProperties>(d: UpdateQuery<T>, opt?: FindOneAndUpdateOption<T>) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const j = await db.collection<T>("channels").findOneAndUpdate({ id: this.id } as any, d, opt);
		await this.refresh();
		return j;
	}

	async edit(data: DeepPartial<ChannelProperties>) {
		// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		if ((data as any)._id) delete (data as any)._id;
		await mdb.collection("channels").findOneAndUpdate({
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
	toJSON(fetch: true): Promise<PublicChannelFetched>;
	toJSON(fetch?: false): PublicChannel;
	toJSON(fetch?: boolean): PublicChannel | Promise<PublicChannelFetched>;
	toJSON(fetch = false): PublicChannel | Promise<PublicChannelFetched> {
		const t = Functions.toJSON(
			this,
			[
				"id",
				"name",
				"topic",
				"type"
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
				...t as PublicChannel,
				server: srv!.toJSON()
			} as PublicChannelFetched;
		}).then((f) => f()) : t as PublicChannel;

	}

	async getServer() {
		return Server.getServer({ id: this.serverId });
	}

	static isChannel(obj: unknown): obj is Channel {
		return obj instanceof Channel;
	}
	static async getChannel(data: string | FilterQuery<GetChannelOptions>) {
		return db.collection("channels").findOne(typeof data === "string" ? { id: data } : (data as AnyObject)).then((d) => d ? new Channel(d.id, d) : null);
	}

	static async new(data: CreateChannelOptions, server: Server | string, idOverride?: string) {
		if (!Server.isServer(server)) {
			const s = await Server.getServer({ id: server });
			if (s === null) throw new TypeError("Invalid server in Channel.new");
			server = s;
		}

		// id override should NOT be used in production
		if (config.dev === false && idOverride) throw new TypeError("Channel.new#idOverride used in production.");
		const id = idOverride ?? Snowflake.generate();

		return db.collection("channels").insertOne(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			Functions.mergeObjects<any, any>(
				{
					...data,
					id,
					serverId: server.id
				},
				this.DEFAULTS
			)
		).then(async ({ ops: [v] }) => {
			// it should be reduced to this already, but it isn't?
			await (server as Server).mongoEdit({
				$push: {
					channels: id
				}
			});
			return new Channel(id, v);
		});
	}
}

export type PublicChannel = Pick<Channel, "id" | "name" | "topic" | "serverId" | "type"> & { createdAt: string; };
export type PublicChannelFetched = Omit<PublicChannel, "serverId"> & { server: PublicServer; };
