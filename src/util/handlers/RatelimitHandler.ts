import { Redis as storeClient } from "../../db";
import RateLimits, { RateLimitTypes } from "../Constants/RateLimits";
import Functions from "../Functions";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { RequestHandler } from "express";

export default class RateLimitHandler {
	static INITIALIZED = false;
	private static HANDLERS = new Map<RateLimitTypes, RequestHandler>();
	private static LIST = new Map<RateLimitTypes, RateLimiterRedis>();

	static init() {
		this.INITIALIZED = true;
		Object.keys(RateLimits).map((k) => {
			const name = k as RateLimitTypes;
			const [points, duration] = RateLimits[name];
			/* this.LIST.set(name, RateLimiter({
				store: this.STORE,
				max,
				windowMs,
				headers: true,
				draft_polli_ratelimit_headers: true,
				handler: (req, res) => res.status(429).json({
					success: false,
					error: Functions.formatError("CLIENT", "RATE_LIMITED")
				})
			})); */
			this.LIST.set(name, new RateLimiterRedis({
				storeClient,
				keyPrefix: "RATELIMITER",
				points,
				duration
			}));

			this.HANDLERS.set(name, (async (req, res, next) => this.LIST.get(name)!
				.consume(Functions.md5Hash(req.ip))
				.then(({ remainingPoints: rem, msBeforeNext: ms }) => {
					const d = new Date();
					res.header({
						"Date": d.toUTCString(),
						"X-RateLimit-Limit": RateLimits[name][0],
						"X-RateLimit-Remaining": rem,
						"X-Rate-Limit-Reset": new Date(d.getTime() + ms).getTime() / 1000,
						"RateLimit-Limit": RateLimits[name][0],
						"RateLimit-Remaining": rem,
						"Rate-Limit-Reset": new Date(d.getTime() + ms).getTime() / 1000
					});
					next();
				})
				.catch(({ remainingPoints: rem, msBeforeNext: ms }: RateLimiterRes) => {
					const d = new Date();
					res.header({
						"Retry-After": ms / 1000,
						"Date": d.toUTCString(),
						"X-RateLimit-Limit": RateLimits[name][0],
						"X-RateLimit-Remaining": rem,
						"X-Rate-Limit-Reset": new Date(d.getTime() + ms).getTime() / 1000,
						"RateLimit-Limit": RateLimits[name][0],
						"RateLimit-Remaining": rem,
						"Rate-Limit-Reset": new Date(d.getTime() + ms).getTime() / 1000
					});
					res.status(429).json({
						success: false,
						error: Functions.formatError("CLIENT", "RATE_LIMITED")
					});
				})));
		});
	}

	static handle(type: RateLimitTypes) {
		return this.HANDLERS.get(type)!;
	}
}

RateLimitHandler.init();
