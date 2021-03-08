import { User } from "../../../db/models";
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
		if (!b.password) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "PASSWORD_REQUIRED")
		});

		if (!req.data.user.checkPassword(b.password)) return res.status(401).json({
			success: false,
			error: Functions.formatError("USER", "INCORRECT_PASSWORD")
		});

		if (b.handle) {
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

		let passwordChange = false;
		if (b.newPassword) {
			if (!PASSWORD.test(b.newPassword)) return res.status(422).json({
				success: false,
				error: Functions.formatError("USER", "INVALID_PASSWORD")
			});
			await req.data.user.setPassword(b.newPassword);
			passwordChange = true;
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
	})
	.put("/@me/connections", RateLimitHandler.handle("ADD_CONNECTION"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
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
		const r = await req.data.user.removeConnection(req.params.id);
		if (r === false) return res.status(404).json({
			success: false,
			error: Functions.formatError("USER", "INVALID_CONNECTION_ID")
		});
		else return res.status(200).json({
			success: true,
			data: null
		});
	});

export default app;
