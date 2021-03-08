// / <reference path="./@types/Express.d.ts" />
import { USER_FLAGS } from "./Constants/General";
import * as Errors from "./Constants/Errors";
import { User } from "../db/models";
import * as fs from "fs-extra";
import { Request, Response } from "express";
import crypto from "crypto";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONReturn<K extends any, N extends Array<keyof K>, O extends Array<keyof K>, T extends boolean = false> = {
	[F in (T extends false ? N[number] : (N[number] | O[number]))]: K[F];
};
export default class Functions {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private constructor() { }

	/* eslint-disable */
	/**
	 * Merge two objects into one
	 *
	 * @param {A} a - The object to merge properties on to
	 * @param {B} b - The object to merge properties from
	 * @template A
	 * @template B
	 */
	static mergeObjects<A extends object, B extends object>(a: A, b: B) {
		// avoid references
		const obj = JSON.parse(JSON.stringify(a)) as A & B,
			// I hate this, but I would much rather do that than rewrite this function
			c = obj as any,
			d = a as any,
			e = b as any;
		for (const k of Object.keys(b)) {
			// handling arrays is a tricky thing since we can't just merge them because of duplicates, so we'll just assume arrays will be zero length if they're "wrong"
			if (Array.isArray(e[k])) c[k] = d[k] && d[k]?.length !== 0 ? d[k] : e[k];
			else if (typeof e[k] === "object" && e[k] !== null) {
				if (typeof d[k] !== "object" || d[k] === null) d[k] = {};
				c[k] = this.mergeObjects(d[k], e[k]);
			} else c[k] = typeof d[k] === "undefined" ? e[k] : d[k];
		}
		return obj;
	}
	/* eslint-enable */

	/**
	 * Sanitize console output to remove special characters.
	 *
	 * @static
	 * @param {string} str - The string to sanitize-
	 * @returns {string}
	 * @memberof Internal
	 * @example Internal.consoleSanitize("someString");
	 */
	static consoleSanitize(str: string) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
		if (typeof str !== "string") str = (str as any).toString();
		// eslint-disable-next-line no-control-regex
		return str.replace(/\u001B\[[0-9]{1,2}m/g, "");
	}

	/**
	 * first letter of every word uppercase.
	 *
	 * @static
	 * @param {string} str - The string to perform the operation on.
	 * @returns {string}
	 * @memberof Strings
	 * @example Strings.ucwords("some string of words");
	 */
	static ucwords(str: string) {
		return str.toString().toLowerCase().replace(/^(.)|\s+(.)/g, (r) => r.toUpperCase());
	}

	static md5Hash(text: string) {
		return crypto.createHash("md5").update(text.toLowerCase()).digest("hex");
	}

	static md5File(file: string) {
		const BUFFER_SIZE = 8192,
			fd = fs.openSync(file, "r"),
			hash = crypto.createHash("md5"),
			buffer = Buffer.alloc(BUFFER_SIZE);

		try {
			let bytesRead;

			do {
				bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE, null);
				hash.update(buffer.slice(0, bytesRead));
			} while (bytesRead === BUFFER_SIZE);
		} finally {
			fs.closeSync(fd);
		}

		return hash.digest("hex");
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	static toJSON<K extends any = never, N extends Array<keyof K> = never, O extends Array<keyof K> = never, T extends boolean = false>(
		self: K,
		publicProperties: N,
		privateProperties: O,
		priv?: T
	): JSONReturn<K, N, O, T> {
		const props: Array<N[number] | (N[number] & O[number])> = [...publicProperties];
		if (priv) props.push(...privateProperties);

		const p = props
			.map((v) => ({
				[v]: self[v]
			}))
			.reduce((a, b) => ({ ...a, ...b })) as JSONReturn<K, N, O, T>;
		return p;
	}

	static calcUserFlags(flags: number) {
		return Object.entries(USER_FLAGS).map(([f, v]) => ({
			[f]: (flags & v) !== 0
		})).reduce((a, b) => ({ ...a, ...b }), {}) as { [K in keyof typeof USER_FLAGS]: boolean; };
	}

	/**
	 * Format byte measurements for human readability.
	 *
	 * @static
	 * @param {(string | number)} str - The amount to format.
	 * @param {number} [precision] - Where to cut off floating point numbers at.
	 * @returns {string}
	 * @memberof Strings
	 * @example Strings.formatBytes("10000000");
	 * @example Strings.formatBytes("1000000000", 2);
	 */
	static formatBytes(str: string | number, precision?: number) {
		if (precision === undefined) precision = 2;
		str = Number(str);
		const { KB, MB, GB } = {
			KB: 1e3,
			MB: 1e6,
			GB: 1e9
		};
		if (str >= GB) return `${(str / GB).toFixed(precision)} GB`;
		else if (str >= MB) return `${(str / MB).toFixed(precision)} MB`;
		else if (str >= KB) return `${(str / KB).toFixed(precision)} KB`;
		else return `${str} B`;
	}

	/* static async checkBodySize(req: express.Request, res: express.Response, next: express.NextFunction) {
		if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase())) return next();

		if (!req.headers["content-length"]) {
			return res.status(400).json({
				success: false,
				error: "Missing 'content-length' header."
			});
		}
		const len = Number(req.headers["content-length"]),
			limit = User.getUserUploadSizeLimit(req.data.user);
		if (len > limit) return res.header("X-Size-Limit", limit.toString()).status(413).end();

		return next();
	} */

	// I hate it but it works
	static verifyUser<T extends Request>(req: T, res: Response, obj: T["data"]["user"]): obj is User {
		// doing constructor.name because of circular dependencies with User
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		if (!!obj && obj.constructor.name === "User") return true;
		else {
			res.status(500).json({
				success: false,
				error: this.formatError("SERVER", "UNKNOWN")
			});
			return false;
		}
	}

	static formatError<K extends keyof typeof Errors = keyof typeof Errors, T extends keyof (typeof Errors[K]) = keyof (typeof Errors[K])>(category: K, type: T, format: Record<string, Uppercase<string>> = {}): typeof Errors[K][T] {
		/* eslint-disable */
		const e = (Errors[category] as any)[type] as typeof Errors[K][T];
		// @ts-ignore
		Object.keys(format).map(v => e.message = e.message.replace(new RegExp(`%${v.toUpperCase()}%`, "g"), format[v]));
		return e!;
		/* eslint-enable */
	}
}
