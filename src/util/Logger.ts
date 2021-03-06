/* eslint-disable no-underscore-dangle */
import Functions from "./Functions";
import config from "../config";
import * as fs from "fs-extra";
import * as leeks from "leeks.js";
import { AnyFunction, AnyObject } from "@uwu-codes/utils";
import util from "util";

export default class Logger {
	private static COLORS = {
		time: leeks.colors.gray,
		log: leeks.colors.green,
		info: leeks.colors.green,
		error: leeks.colors.red,
		warn: leeks.colors.yellow,
		debug: leeks.colors.cyan,
		command: leeks.colors.green
	};

	static get log() {
		return this._log.bind(this, "log");
	}
	static get info() {
		return this._log.bind(this, "info");
	}
	static get error() {
		return this._log.bind(this, "error");
	}
	static get warn() {
		return this._log.bind(this, "warn");
	}
	static get debug() {
		return this._log.bind(this, "debug");
	}
	static get command() {
		return this._log.bind(this, "command");
	}

	private static _log(type: keyof typeof Logger["COLORS"], name: string | Array<string>, message?: AnyObject | Buffer | AnyFunction | string) {
		const d = new Date(),
			time = d.toString().split(" ")[4],
			date = `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate()}-${d.getFullYear()}`;
		if (!name) throw new TypeError("Missing logger name.");
		if (!message) {
			message = Array.isArray(name) ? name[0] : name;
			name = "General";
		}
		if (typeof message !== "string") {
			if (message instanceof Buffer || typeof message === "function") message = message.toString();
			if (typeof message === "object") message = util.inspect(message, { depth: null, colors: true, showHidden: true });
		}


		if (!fs.existsSync(config.dir.logs)) fs.mkdirpSync(config.dir.logs);
		fs.appendFileSync(`${config.dir.logs}/${date}.log`, Functions.consoleSanitize(`[${time}] ${Functions.ucwords(type)} | ${Array.isArray(name) ? name.join(" | ") : name.toString()} | ${message}\n`));
		process.stdout.write(`[${Logger.COLORS.time(time)}] ${Logger.COLORS[type](Functions.ucwords(type))} | ${Array.isArray(name) ? name.map((n) => Logger.COLORS[type](n)).join(" | ") : Logger.COLORS[type](name.toString())} | ${Logger.COLORS[type](message)}\n`);
	}
}
