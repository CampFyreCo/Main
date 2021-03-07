// / <reference path="../@types/Express.d.ts" />
import Functions from "../Functions";
import { AUTHORIZATION as AuthorizationErrors } from "../Constants/Errors";
import { User } from "../../db/models";
import express from "express";

export type AuthLevel = "none" | "verifiedEmail" | "staff" | "admin";

// this has to be separated from normal functions because of circular imports with Logger & db
export default class AuthHandler {
	static handle(type?: "token", level?: AuthLevel | Array<AuthLevel>) {
		return async function (req: express.Request, res: express.Response, next: express.NextFunction) {
			switch (type) {
				// I could have done a direct lookup for tokens via "authTokens.token": "" but I wanted to distinguish between
				// api keys & site users
				// auth is Basic Authentication with id:token
				case "token": {
					if (!req.headers.authorization) {
						return res.status(401).json({
							success: false,
							error: AuthorizationErrors.MISSING
						});
					}

					const [authType, auth] = req.headers.authorization.toString().split(" ") ?? [];
					if (authType.toLowerCase() !== "basic") {
						return res.status(400).json({
							success: false,
							error: AuthorizationErrors.UNKNOWN_SCHEME
						});
					}

					const [id, token] = Buffer.from(auth, "base64").toString("ascii").split(":") ?? [];

					if (id === undefined || token === undefined) {
						return res.status(400).json({
							success: false,
							error: AuthorizationErrors.BADLY_FORMED
						});
					}

					const u = await User.getUser({
						id
					});

					if (u === null) {
						return res.status(400).json({
							success: false,
							error: AuthorizationErrors.INVALID_USER
						});
					}

					if (!u.authTokens.map(({ token: t }) => t).includes(token)) {
						return res.status(401).json({
							success: false,
							error: AuthorizationErrors.INVALID
						});
					}

					req.data.user = u;

					break;
				}

				/* case "key": {
					if (!req.headers.authorization) {
						return res.status(401).json({
							success: false,
							error: "Missing authorization."
						});
					}

					const u = await User.getUser({
						apiKey: req.headers.authorization
					});

					if (u === null || u.apiKey === null) {
						return res.status(401).json({
							success: false,
							error: "Invalid authorization."
						});
					}

					req.data.user = u;
					break;
				} */

				default: {
					if (!req.headers.authorization) {
						return res.status(401).json({
							success: false,
							error: AuthorizationErrors.MISSING
						});
					}

					const [authType, auth] = req.headers.authorization.toString().split(" ") ?? [];
					if (authType.toLowerCase() !== "basic") {
						return res.status(400).json({
							success: false,
							error: AuthorizationErrors.UNKNOWN_SCHEME
						});
					}

					const [id, token] = Buffer.from(auth, "base64").toString("ascii").split(":") ?? [];

					if (id === undefined || token === undefined) {
						return res.status(400).json({
							success: false,
							error: AuthorizationErrors.BADLY_FORMED
						});
					}

					const u = await User.getUser({
						id
					});

					if (u === null) {
						return res.status(400).json({
							success: false,
							error: "Invalid user in authentication."
						});
					}

					if (!u.authTokens.map(({ token: t }) => t).includes(token)) {
						return res.status(401).json({
							success: false,
							error: "Invalid authentication."
						});
					}

					req.data.user = u;
				}
			}

			const c = await AuthHandler.checkLevel(level, req, res);
			// don't pass control to further down handlers if we've already ended the request
			if (c !== undefined) return;
			return next();
		};
	}

	// must be used with the above so data.user is guaranteed
	private static async checkLevel(level: AuthLevel | Array<AuthLevel> | undefined, req: express.Request, res: express.Response) {
		if (level === undefined || (Array.isArray(level) && level.length === 0)) level = ["none"];
		if (!Array.isArray(level)) level = [level];
		const u = req.data.user!,
			f = Functions.calcUserFlags(u.flags);

		for (const l of level) {
			switch (l) {
				case "none": continue;

				// staff/admin bypass?
				case "verifiedEmail": {
					if (u.emailVerified === false) {
						return res.status(403).json({
							success: false,
							error: "A verified email is required to use this."
						});
					} else continue;
				}

				case "staff": {
					if (f.STAFF || f.ADMIN) continue;
					else {
						return res.status(403).json({
							success: false,
							error: "You must be a staff member to use this."
						});
					}
				}

				case "admin": {
					if (f.ADMIN) continue;
					else {
						return res.status(403).json({
							success: false,
							error: "You must be an admin to use this."
						});
					}
				}
			}
		}
	}
}
