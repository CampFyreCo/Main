import {
	UserProperties,
	ServerProperties
} from "./models";
import config from "../config";
import Logger from "../util/Logger";
import Timers from "../util/Timers";
import deasync from "deasync";
import IORedis from "ioredis";
import { Collection, MongoClient, WithId } from "mongodb";


export type Names = "user";
export type CollectionNames = `${Names}s`;

class Database {
	static connection: MongoClient;
	static r: IORedis.Redis;
	private constructor() {
		throw new TypeError("This class may not be instantiated, use static methods.");
	}

	static init() {
		const r = this.r = new IORedis(config.services.redis.port, config.services.redis.host, {
			password: config.services.redis.password,
			db: config.services.redis.db,
			enableReadyCheck: true,
			autoResendUnfulfilledCommands: true,
			connectionName: "CampFyre"
		});

		r
			.on("connect", () => Logger.debug("Redis", `Connected to redis://${config.services.redis.host}:${config.services.redis.port} (db: ${config.services.redis.db})`));


		try {
			const t = new Timers(false);
			t.start("connect");
			Logger.debug("Database", `Connecting to mongodb://${config.services.db.host}:${config.services.db.port}?retryWrites=true&w=majority (SSL: ${config.services.db.options.ssl ? "Yes" : "No"})`);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			this.connection = deasync(MongoClient.connect.bind(MongoClient))(`mongodb://${config.services.db.host}:${config.services.db.port}/?retryWrites=true&w=majority`, config.services.db.options);
			t.end("connect");
			Logger.debug("Database", `Connected to mongodb://${config.services.db.host}:${config.services.db.port}?retryWrites=true&w=majority (SSL: ${config.services.db.options.ssl ? "Yes" : "No"}) in ${t.calc("connect")}ms`);
		} catch (e) {
			Logger.error("Database", `Error connecting to MongoDB instance (mongodb://${config.services.db.host}:${config.services.db.port}?retryWrites=true&w=majority, SSL: ${config.services.db.options.ssl ? "Yes" : "No"})\nReason: ${(e as Error)?.stack || (e as Error).toString()}`);
			return; // don't need to rethrow it as it's already logged
		}
	}

	static get Redis() {
		return this.r;
	}
	static get mongo() {
		return this.connection;
	}
	static get mdb() {
		return this.mongo.db(config.services.db.db);
	}

	static collection(col: "servers"): Collection<WithId<ServerProperties>>;
	static collection(col: "users"): Collection<WithId<UserProperties>>;
	static collection<T = unknown>(col: string): Collection<T>;
	static collection(col: string) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return this.mdb.collection(col);
	}
}

Database.init();

const { mongo, mdb, Redis } = Database;

export {
	Database as db,
	mdb,
	mongo,
	Redis
};

export default Database;
