import { Server, User } from "../../../db/models";
import RateLimitHandler from "../../../util/handlers/RatelimitHandler";
import { CONNECTIONS, EMAIL, HANDLE, MAX_AVATAR_SIZE, MAX_CONNECTIONS, MAX_SAMESITE_CONNECTIONS, NAME, PASSWORD } from "../../../util/Constants/General";
import Functions from "../../../util/Functions";
import Mailer from "../../../util/handlers/email/Mailer";
import config from "../../../config";
import Logger from "../../../util/Logger";
import express from "express";
import { AnyObject } from "@uwu-codes/utils";
import * as fs from "fs-extra";
import FileType from "file-type";
import crypto from "crypto";

const app = express.Router();

app

	.get("/@me", RateLimitHandler.handle("GET_SELF_USER"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		res.status(200).json({
			success: true,
			data: req.data.user.toJSON(true)
		});
	})
	.patch("/@me", RateLimitHandler.handle("EDIT_SELF_USER"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		const b = req.body as AnyObject<string>;
		const d: Partial<{ handle: string; name: string; email: string; avatar: string; }> = {};
		let passwordChange = false;
		if (req.data.user.bot === false) {
			if (!b.password) return res.status(400).json({
				success: false,
				error: Functions.formatError("USER", "PASSWORD_REQUIRED")
			});

			if (!req.data.user.checkPassword(b.password)) return res.status(401).json({
				success: false,
				error: Functions.formatError("USER", "INCORRECT_PASSWORD")
			});


			if (b.email) {
				if (!EMAIL.test(b.email.toString())) return res.status(422).json({
					success: false,
					error: Functions.formatError("USER", "INVALID_EMAIL")
				});
				// the start of emails is technically case sensitive, so we have to do it with regex
				// https://stackoverflow.com/q/9807909/#comment40364273_9808332
				const e = await User.getUser({ email: new RegExp(`^${b.email}$`.toLowerCase(), "i") });
				if (e !== null) return res.status(409).json({
					success: false,
					error: Functions.formatError("USER", "EMAIL_IN_USE")
				});

				d.email = b.email.toLowerCase();
			}

			if (b.newPassword) {
				if (!PASSWORD.test(b.newPassword)) return res.status(422).json({
					success: false,
					error: Functions.formatError("USER", "INVALID_PASSWORD")
				});
				await req.data.user.setPassword(b.newPassword);
				passwordChange = true;
			}
		}

		if (b.handle) {
			if (req.data.user.handleLocked === true) return res.status(403).json({
				success: false,
				error: Functions.formatError("USER", "HANDLE_LOCKED")
			});
			if (!HANDLE.test(b.handle.toString())) return res.status(422).json({
				success: false,
				error: Functions.formatError("USER", "INVALID_HANDLE")
			});
			const h = await User.getUser({ handle: b.handle.toLowerCase() });
			if (h !== null) return res.status(409).json({
				success: false,
				error: Functions.formatError("USER", "HANDLE_IN_USE")
			});

			d.handle = b.handle.toLowerCase();
		}

		if (b.name) {
			if (!NAME.test(b.name.toString())) return res.status(422).json({
				success: false,
				error: Functions.formatError("USER", "INVALID_NAME")
			});

			d.name = b.name;
		}

		if (b.avatar) {
			const b64 = b.avatar.split("base64;").slice(-1)[0];

			if (b64.length > MAX_AVATAR_SIZE) return res.status(413).json({
				success: false,
				data: Functions.formatError("USER", "AVATAR_TOO_LARGE")
			});

			const r = crypto.randomBytes(32).toString("hex");
			const loc = `${config.dir.tmp}/${r}`;
			try {
				fs.writeFileSync(loc, b64, { encoding: "base64" });
			} catch (e) {
				Logger.error("PatchUser -> Avatar", e);
				if (fs.existsSync(loc)) fs.unlinkSync(loc);
				return res.status(422).json({
					success: false,
					data: Functions.formatError("USER", "INVALID_AVATAR")
				});
			}
			const md5 = Functions.md5File(loc);
			const type = await FileType.fromFile(loc);
			if (type === undefined) {
				fs.unlinkSync(loc);
				return res.status(422).json({
					success: false,
					data: Functions.formatError("USER", "UNKNOWN_FILE_TYPE")
				});
			}

			if (!Object.keys(config.mimes).includes(type.mime)) {
				fs.unlinkSync(loc);
				return res.status(422).json({
					success: false,
					data: Functions.formatError("USER", "UNSUPPORTED_FILE_TYPE")
				});
			}

			if (!fs.existsSync(`${config.dir.static.avatar}/${req.data.user.id}/${md5}`)) fs.moveSync(loc, `${config.dir.static.avatar}/${req.data.user.id}/${md5}`);

			d.avatar = md5;
		}

		for (const j in d) {
			if (Object.prototype.hasOwnProperty.call(d, j)) {
				const k = j as keyof typeof d;
				if (req.data.user[k] === d[k]) delete d[k];
			}
		}

		if (JSON.stringify(d) === "{}" && passwordChange === false) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "NOT_MODIFIED")
		});

		await req.data.user.edit(d);
		if (d.email) await Mailer.sendConfirmation(req.data.user);

		return res.status(200).json({
			success: true,
			data: req.data.user.toJSON(true)

		});
	})
	.put("/@me/connections", RateLimitHandler.handle("ADD_CONNECTION"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		if (req.data.user.bot === true) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "BOTS_CANNOT_USE_THIS_ENDPOINT")
		});
		const b = req.body as AnyObject<string>;
		if (!b.type) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "MISSING_CONNECTION_TYPE")
		});
		if (!b.value) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "MISSING_CONNECTION_VALUE")
		});
		if (!(CONNECTIONS as Readonly<Array<string>>).includes(b.type)) return res.status(422).json({
			success: false,
			error: Functions.formatError("USER", "CONNECTION_TYPE_INVALID")
		});
		if (req.data.user.connections.length > MAX_CONNECTIONS) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "CONNECTION_LIMIT")
		});
		const c = req.data.user.connections.filter(con => con.type === b.type);
		if (c.length >= MAX_SAMESITE_CONNECTIONS) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "CONNECTION_TYPE_LIMIT")
		});
		if (c.find(v => v.value.toLowerCase() === b.value.toLowerCase())) return res.status(409).json({
			success: false,
			error: Functions.formatError("USER", "CONNECTION_ALREADY_LISTED")
		});
		let vis: User["connections"][number]["visibility"] = "private";
		if (b.visibility) {
			if (["public", "friends", "private"].includes(b.visibility)) vis = b.visibility as typeof vis;
			else return res.status(422).json({
				success: false,
				error: Functions.formatError("USER", "INVALID_CONNECTION_VISIBILITY", {
					VIS: b.visibility
				})
			});
		}

		const con = await req.data.user.addConnection(b.type as User["connections"][number]["type"], b.value, vis);

		return res.status(200).json({
			success: false,
			data: con
		});
	})
	.delete("/@me/connections/:id", RateLimitHandler.handle("REMOVE_CONNECTION"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		if (req.data.user.bot === true) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "BOTS_CANNOT_USE_THIS_ENDPOINT")
		});
		const r = await req.data.user.removeConnection(req.params.id);
		if (r === false) return res.status(404).json({
			success: false,
			error: Functions.formatError("USER", "INVALID_CONNECTION_ID")
		});
		else return res.status(200).json({
			success: true,
			data: null
		});
	})
	.get("/@me/servers", RateLimitHandler.handle("GET_SELF_SERVERS"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		const data = await Promise.all(req.data.user.servers.map(Server.getServer.bind(Server)));
		res.status(200).json({
			success: true,
			data
		});
	})
	.delete("/@me/servers/:id", RateLimitHandler.handle("LEAVE_SERVER"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		const srv = await Server.getServer(req.params.id);
		if (srv === null) return res.status(404).json({
			success: false,
			data: Functions.formatError("SERVER", "UNKNOWN")
		});
		if (!req.data.user.inServer(req.params.id)) return res.status(404).json({
			success: false,
			data: Functions.formatError("USER", "NO_ACCESS_SERVER")
		});

		if (srv.owner === req.data.user.id) return res.status(403).json({
			success: false,
			data: Functions.formatError("SERVER", "OWNER")
		});

		await srv.removeMember(req.data.user.id, "leave");

		return res.status(204).end();
	})
	.post("/@me/mfa", RateLimitHandler.handle("ENABLE_MFA"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		if (req.data.user.bot === true) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "BOTS_CANNOT_USE_THIS_ENDPOINT")
		});
		const b = req.body as AnyObject<string>;

		if (!b.password) return res.status(400).json({
			success: false,
			data: Functions.formatError("USER", "PASSWORD_REQUIRED")
		});

		if (!req.data.user.checkPassword(b.password)) return res.status(401).json({
			success: false,
			data: Functions.formatError("USER", "INCORRECT_PASSWORD")
		});

		const mfa = await req.data.user.enableMFA();
		if (mfa === null) return res.status(400).json({
			success: false,
			data: Functions.formatError("USER", "MFA_ALREADY_ENABLED")
		});

		return res.status(200).json({
			success: true,
			data: mfa
		});
	})
	.delete("/@me/mfa", RateLimitHandler.handle("DISABLE_MFA"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		if (req.data.user.bot === true) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "BOTS_CANNOT_USE_THIS_ENDPOINT")
		});
		const b = req.body as AnyObject<string>;

		if (!b.password) return res.status(400).json({
			success: false,
			data: Functions.formatError("USER", "PASSWORD_REQUIRED")
		});

		if (!req.data.user.checkPassword(b.password)) return res.status(401).json({
			success: false,
			data: Functions.formatError("USER", "INCORRECT_PASSWORD")
		});

		if (req.data.user.mfaEnabled === false) return res.status(400).json({
			success: false,
			data: Functions.formatError("USER", "MFA_NOT_ENABLED")
		});

		// since they could have lost it, we allow them to disable it with a code if it hasn't been verified
		if (req.data.user.mfaVerified) {
			if (!b.code) return res.status(400).json({
				success: false,
				data: Functions.formatError("AUTHORIZATION", "MFA_CODE_REQUIRED")
			});

			const m = await req.data.user.verifyMFA(b.code);
			if (m === false) return res.status(401).json({
				success: false,
				data: Functions.formatError("AUTHORIZATION", "MFA_CODE_INCORRECT")
			});
		}

		await req.data.user.edit({
			mfaEnabled: false,
			mfaVerified: false,
			mfaSecret: null,
			mfaBackupCodes: []
		});

		return res.status(204).end();
	})
	.put("/@me/mfa/verify", RateLimitHandler.handle("VERIFY_MFA"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		if (req.data.user.bot === true) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "BOTS_CANNOT_USE_THIS_ENDPOINT")
		});
		const b = req.body as AnyObject<string>;
		if (!b.code) return res.status(400).json({
			success: false,
			data: Functions.formatError("AUTHORIZATION", "MFA_CODE_REQUIRED")
		});

		const v = await req.data.user.verifyMFA(b.code);
		if (!v) return res.status(404).json({
			success: false,
			data: Functions.formatError("AUTHORIZATION", "MFA_CODE_INCORRECT")
		});
		else return res.status(204).end();
	})
	.get("/@me/mfa/backup-codes", RateLimitHandler.handle("GET_BACKUP_CODES"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		if (req.data.user.bot === true) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "BOTS_CANNOT_USE_THIS_ENDPOINT")
		});
		const b = req.body as AnyObject<string>;

		if (req.data.user.mfaEnabled === false) return res.status(400).json({
			success: false,
			data: Functions.formatError("USER", "MFA_NOT_ENABLED")
		});

		if (!b.password) return res.status(400).json({
			success: false,
			data: Functions.formatError("USER", "PASSWORD_REQUIRED")
		});

		if (!req.data.user.checkPassword(b.password)) return res.status(401).json({
			success: false,
			data: Functions.formatError("USER", "INCORRECT_PASSWORD")
		});

		return res.status(200).json({
			success: true,
			data: req.data.user.mfaBackupCodes
		});
	})
	.post("/@me/mfa/backup-codes/reset", RateLimitHandler.handle("RESET_BACKUP_CODES"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		if (req.data.user.bot === true) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "BOTS_CANNOT_USE_THIS_ENDPOINT")
		});
		const b = req.body as AnyObject<string>;

		if (req.data.user.mfaEnabled === false) return res.status(400).json({
			success: false,
			data: Functions.formatError("USER", "MFA_NOT_ENABLED")
		});

		if (!b.password) return res.status(400).json({
			success: false,
			data: Functions.formatError("USER", "PASSWORD_REQUIRED")
		});

		if (!req.data.user.checkPassword(b.password)) return res.status(401).json({
			success: false,
			data: Functions.formatError("USER", "INCORRECT_PASSWORD")
		});

		return res.status(200).json({
			success: true,
			data: await req.data.user.resetBackupCodes()
		});
	})
	.get("/:id", RateLimitHandler.handle("GET_USER"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		const u = await User.getUser({ id: req.params.id });
		if (u === null) {
			return res.status(404).json({
				success: false,
				error: Functions.formatError("USER", "UNKNOWN")
			});
		} else {
			return res.status(200).json({
				success: true,
				data: u.toJSON(false)
			});
		}
	});

export default app;
