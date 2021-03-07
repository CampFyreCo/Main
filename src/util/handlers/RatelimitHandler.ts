import { Redis } from "../../db";
import RateLimits from "../Constants/RateLimits";
import { RATE_LIMITED } from "../Constants/Errors";
import { Request, Response, NextFunction } from "express";

export interface RateLimitInfo {
	limit: number;
	remaining: number;
	usage: number;
	creation: number;
	reset: number;
	usable: boolean;
}
export type RateLimitTypes = Exclude<keyof typeof RateLimits, "prototype">;
export default class RateLimitHandler {
	static getHeaders({ limit, remaining, reset }: RateLimitInfo) {
		return {
			"X-RateLimit-Limit": limit,
			"X-RateLimit-Remaining": remaining,
			"X-RateLimit-Reset": reset
		};
	}

	static handle(type: RateLimitTypes) {
		return (async (req: Request, res: Response, next: NextFunction) => {
			const rl = await RateLimitHandler.consume(type, req.data.user!.id);
			res.header(RateLimitHandler.getHeaders(rl));
			if (rl.usable === false) res.status(429).json({
				success: false,
				error: RATE_LIMITED
			});
			else return next();
		});
	}

	static async get(type: RateLimitTypes, id: string): Promise<RateLimitInfo> {
		const t = Date.now();
		const limit = RateLimits[type][0];
		const time = RateLimits[type][1];
		const v = await Redis.get(`ratelimiting:${type}:${id}`);
		if (v === null) return {
			limit,
			remaining: limit,
			usage: 0,
			creation: 0,
			reset: 0,
			usable: true
		};
		else {
			let c = { creation: 0, usage: 0 };
			try {
				c = JSON.parse(v) as typeof c;
			} catch (e) {
				if (e instanceof Error) { // thanks typescript
					throw new Error(`Failed to decode redis key "ratelimiting:${type}:${id}", ${e.toString()}`);
				}
			}

			// console.log(((c.creation + time) - t) / 1e3, "seconds remaining");
			if ((c.creation + time) < t) {
				await Redis.del(`ratelimiting:${type}:${id}`);
				return {
					limit,
					remaining: limit,
					usage: 0,
					creation: 0,
					reset: 0,
					usable: true
				};
			}

			return {
				limit,
				remaining: limit - c.usage,
				usage: c.usage,
				creation: c.creation,
				reset: c.creation + time,
				usable: c.usage < limit
			};
		}
	}

	static async consume(type: RateLimitTypes, id: string, amount = 1) {
		const t = Date.now();
		const v = await this.get(type, id);
		if (v.remaining > 0) {
			const ttl = await Redis.ttl(`ratelimiting:${type}:${id}`);
			await Redis.setex(`ratelimiting:${type}:${id}`, ttl, JSON.stringify({ creation: v.creation || t, usage: v.usage + amount }));
		}
		const n = await this.get(type, id);
		if (v.remaining > 0) n.usable = true;
		return n;
	}
}
