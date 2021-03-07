import { User } from "../../../db/models";
import { USER as UserErrors } from "../../../util/Constants/Errors";
import RateLimitHandler from "../../../util/handlers/RatelimitHandler";
import { EMAIL, HANDLE, NAME, PASSWORD } from "../../../util/Constants/General";
import Functions from "../../../util/Functions";
import Mailer from "../../../util/handlers/email/Mailer";
import express from "express";
import { AnyObject } from "@uwu-codes/utils";

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
		const d: Partial<{ handle: string; name: string; email: string; }> = {};
		if (!b.password) return res.status(400).json({
			success: false,
			error: UserErrors.PASSWORD_REQUIRED
		});

		if (!req.data.user.checkPassword(b.password)) return res.status(401).json({
			success: false,
			error: UserErrors.INCORRECT_PASSWORD
		});

		if (b.handle) {
			if (!HANDLE.test(b.handle.toString())) return res.status(422).json({
				success: false,
				error: UserErrors.INVALID_HANDLE
			});
			const h = await User.getUser({ handle: b.handle.toLowerCase() });
			if (h !== null) return res.status(409).json({
				success: false,
				error: UserErrors.HANDLE_IN_USE
			});

			d.handle = b.handle.toLowerCase();
		}

		if (b.name) {
			if (!NAME.test(b.name.toString())) return res.status(422).json({
				success: false,
				error: UserErrors.INVALID_NAME
			});

			d.name = b.name;
		}

		if (b.email) {
			if (!EMAIL.test(b.email.toString())) return res.status(422).json({
				success: false,
				error: UserErrors.INVALID_EMAIL
			});
			// the start of emails is technically case sensitive, so we have to do it with regex
			// https://stackoverflow.com/q/9807909/#comment40364273_9808332
			const e = await User.getUser({ email: new RegExp(`^${b.email}$`.toLowerCase(), "i") });
			if (e !== null) return res.status(409).json({
				success: false,
				error: UserErrors.EMAIL_IN_USE
			});

			d.email = b.email.toLowerCase();
		}

		let passwordChange = false;
		if (b.newPassword) {
			if (!PASSWORD.test(b.newPassword)) return res.status(422).json({
				success: false,
				error: UserErrors.INVALID_PASSWORD
			});
			await req.data.user.setPassword(b.newPassword);
			passwordChange = true;
		}

		for (const j in d) {
			if (Object.prototype.hasOwnProperty.call(d, j)) {
				const k = j as keyof typeof d;
				if (req.data.user[k] === d[k]) delete d[k];
			}
		}

		if (JSON.stringify(d) === "{}" && passwordChange === false) return res.status(400).json({
			success: false,
			error: UserErrors.NOT_MODIFIED
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
				error: UserErrors.UNKNOWN
			});
		} else {
			return res.status(200).json({
				success: true,
				data: u.toJSON(false)
			});
		}
	});

export default app;
