import AuthHandler from "../../../util/handlers/AuthHandler";
import Verification from "../../../util/handlers/email/Verification";
import { User } from "../../../db/models";
import { Colors, EMAIL, HANDLE } from "../../../util/Constants/General";
import WebhookHandler from "../../../util/handlers/WebhookHandler";
import Mailer from "../../../util/handlers/email/Mailer";
import Functions from "../../../util/Functions";
import RateLimitHandler from "../../../util/handlers/RatelimitHandler";
import express from "express";
import { AnyObject } from "@uwu-codes/utils";

const app = express.Router();

app
	.use(async (req, res, next) => {
		// we don't keep this data across sessions, but we do still need a place to store it
		req.data = {
			user: null
		};

		return next();
	})
	.post("/login", RateLimitHandler.handle("USER_LOGIN"),async (req, res) => {
		const b = req.body as AnyObject<string>;
		if (!b.email && !b.handle) return res.status(400).json({
			success: false,
			error: "Handle or email is required."
		});

		if (!b.password) return res.status(400).json({
			success: false,
			error: "Password is required."
		});

		if (b.handle && !HANDLE.test(b.handle)) return res.status(422).json({
			success: false,
			error: Functions.formatError("USER", "INVALID_HANDLE")
		});

		if (b.email && !EMAIL.test(b.email)) return res.status(422).json({
			success: false,
			error: Functions.formatError("USER", "INVALID_EMAIL")
		});

		let u: User | null;

		if (b.handle) u = await User.getUser({
			handle: b.handle
		});
		else if (b.email) u = await User.getUser({
			email: b.email
		});
		else u = null;

		if (u === null) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "NO_USER_FOUND")
		});

		if (u.password === null) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "NO_PASSWORD")
		});

		const p = u.checkPassword(b.password);

		if (!p) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "INCORRECT_PASSWORD")
		});

		if (u.mfaEnabled && u.mfaVerified) return res.status(200).json({
			success: true,
			data: {
				token: await u.createMFALoginToken(req.ip),
				mfa: true
			}
		});
		else return res.status(200).json({
			success: true,
			data: {
				token: await u.createAuthToken(req.ip, req.headers["user-agent"]),
				mfa: false
			}
		});
	})
	.post("/login/mfa", RateLimitHandler.handle("USER_LOGIN_MFA"), async (req, res) => {
		const b = req.body as AnyObject<string>;
		if (!b.token) return res.status(400).json({
			success: false,
			error: Functions.formatError("AUTHORIZATION", "LOGIN_TOKEN_REQUIRED")
		});

		if (!b.code) return res.status(400).json({
			success: false,
			error: Functions.formatError("AUTHORIZATION", "MFA_CODE_REQUIRED")
		});

		const c = await User.useMFALoginToken(req.ip, b.token);

		if (c === null) return res.status(404).json({
			success: false,
			error: Functions.formatError("AUTHORIZATION", "LOGIN_TOKEN_INVALID")
		});

		// this shouldn't happen, but it has a small possibility of happening
		const u = await User.getUser({ id: c });
		if (u === null) return res.status(500).json({
			success: false,
			error: Functions.formatError("INTERNAL", "UNKNOWN")
		});

		const mfaCheck = await u.verifyMFA(b.code);

		// send back a new token if mfa is incorrect, so they don't need to login again,
		// since we already know they have the correct details
		if (!mfaCheck) return res.status(401).json({
			success: false,
			error: Functions.formatError("AUTHORIZATION", "MFA_CODE_INCORRECT"),
			data: {
				token: await u.createMFALoginToken(req.ip),
				mfa: true
			}
		});

		return res.status(200).json({
			success: true,
			data: await u.createAuthToken(req.ip, req.headers["user-agent"])
		});
	})
	.post("/register", RateLimitHandler.handle("USER_REGISTER"), async (req, res) => {
		const b = req.body as AnyObject<string>;
		if (!b.handle) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "HANDLE_REQUIRED")
		});

		if (!b.email) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "EMAIL_REQUIRED")
		});

		if (!b.password) return res.status(400).json({
			success: false,
			error: Functions.formatError("USER", "PASSWORD_REQUIRED")
		});

		if (!HANDLE.test(b.handle)) return res.status(422).json({
			success: false,
			error: Functions.formatError("USER", "INVALID_HANDLE")
		});

		if (!EMAIL.test(b.email)) return res.status(422).json({
			success: false,
			error: Functions.formatError("USER", "INVALID_EMAIL")
		});

		const h = await User.getUser({
			handle: b.handle
		});
		const e = await User.getUser({
			email: b.email
		});

		if (h !== null) return res.status(409).json({
			success: false,
			error: Functions.formatError("USER", "HANDLE_IN_USE")
		});
		if (e !== null) return res.status(409).json({
			success: false,
			error: Functions.formatError("USER", "EMAIL_IN_USE")
		});

		const u = await User.new({
			email: b.email,
			handle: b.handle.toLowerCase(),
			name: b.handle.toLowerCase()
		}).then((v) => v === null ? null : new User(v.id, v));

		if (u === null) return res.status(500).json({
			success: false,
			error: "Unknown internal server error."
		});

		await u.setPassword(b.password);

		await Mailer.sendConfirmation(u);

		await WebhookHandler.executeDiscord("user", {
			title: "User Registered",
			color: Colors.green,
			description: [
				`User: @${u.handle} (${u?.id})`,
				`Email: \`${u.email!}\``
			].join("\n"),
			timestamp: new Date().toISOString()
		});

		return res.status(201).json({
			success: true,
			data: await u.createAuthToken(req.ip, req.headers["user-agent"])
		});
	})
	.get("/confirm-email", RateLimitHandler.handle("CONFIRM_EMAIL"), async (req, res) => {
		const t = req.query.token?.toString();
		if (t === undefined) return res.status(404).end("Missing confirmation token.");

		const e = Verification.getEmailFromToken(t);
		const v = Verification.get(e!);

		if (e === undefined || v === undefined) return res.status(404).end("Unknown confirmation token.");

		const u = await User.getUser({
			id: v.user
		});

		if (u === null) return res.status(404).end("Unknown user.");

		await u.edit({
			emailVerified: true
		});

		Verification.remove(e, "USED");

		return res.status(200).end("Your email has been confirmed. You can now close this page.");
	})
	.use(AuthHandler.handle())
	.post("/confirm-email", RateLimitHandler.handle("CONFIRM_EMAIL_START"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		if (req.data.user.emailVerified) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "EMAIL_ALREADY_VEIRIFED")
		});

		if (req.data.user.email === null) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "NO_EMAIL")
		});

		await Mailer.sendConfirmation(req.data.user);

		return res.status(204).end();
	})
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
	.use("/users", require("./users").default);

export default app;
