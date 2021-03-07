import config from "../../../config";
import Logger from "../../Logger";
import WebhookHandler from "../WebhookHandler";
import { User } from "../../../db/models";
import * as fs from "fs-extra";
import crypto from "crypto";
import path from "path";

interface Entry {
	user: string;
	token: string;
	expire: string;
}

export default class Verification {
	static readonly FILE = `${config.dir.base}/src/config/extra/email-verification.json`;
	// 24 hours
	static readonly EXPIRE_TIME = 8.64e+7;
	private static ENTRIES: Map<string, Entry> = new Map<string, Entry>();
	static lastSave: string = new Date().toISOString();
	static saveInterval: NodeJS.Timeout;
	static loadInterval: NodeJS.Timeout;

	static loadEntries() {
		this.ENTRIES = new Map<string, Entry>();
		(fs.readJSONSync(this.FILE) as Array<[key: string, value: Entry]>).map(([a, b]) => this.ENTRIES.set(a, b));
	}

	static init() {
		if (!fs.existsSync(this.FILE)) {
			fs.mkdirpSync(path.dirname(this.FILE));
			fs.writeFileSync(this.FILE, JSON.stringify([]));
		}

		this.saveInterval = setInterval(() => {
			for (const [email, { expire }] of this.ENTRIES.entries()) {
				if (new Date(expire).getTime() < Date.now()) this.remove(email, "TIMEOUT");
			}
		}, 1e3);

		// load entries every 30 seconds
		this.loadInterval = setInterval(this.loadEntries.bind(this), 3e4);
		this.loadEntries();
	}

	static save() {
		fs.writeFileSync(this.FILE, JSON.stringify(
			Array.from(
				this.ENTRIES.entries()
			)
		));
		this.lastSave = new Date().toISOString();
	}

	static get has() {
		return this.ENTRIES.has.bind(this.ENTRIES);
	}
	static get get() {
		return this.ENTRIES.get.bind(this.ENTRIES);
	}
	static getEmailFromToken(token: string) {
		return Array.from(this.ENTRIES).find(([, { token: t }]) => t === token)?.[0];
	}

	static add(email: string, user: string, token?: string) {
		Logger.debug("MailerVerification->add", `Added a verification token for "${email}" (U-${user})`);
		if (!token) token = this.generateToken();
		const e = this.ENTRIES.set(email, {
			user,
			token,
			expire: new Date(Date.now() + this.EXPIRE_TIME).toISOString()
		}).get(email)!;
		this.save();
		void User.getUser(user)
			.then(async (u) => {
				if (u === null) return;
				return WebhookHandler.executeDiscord("email", {
					title: "Email Verification Started",
					color: 0x00A000,
					description: [
						`User: @${u.handle} (${u.id})`,
						`Email: \`${u.email ?? "None"}\``
					].join("\n"),
					footer: {
						text: "Expires At"
					},
					timestamp: new Date(Date.now() + this.EXPIRE_TIME).toISOString()
				});
			});
		return e;
	}

	static remove(email: string, reason?: "TIMEOUT" | "USED") {
		const v = this.ENTRIES.get(email);
		Logger.debug("MailerVerification->remove", `Removed the verification token for "${email}" (U-${v?.user || "Unknown"}, Reason: ${reason || "UNKNOWN"})`);
		const i = this.ENTRIES.delete(email);
		this.save();
		void User.getUser({ email })
			.then(async (u) => {
				if (u === null) return;
				return WebhookHandler.executeDiscord("email", {
					title: "Email Verification Ended",
					color: 0xF02C00,
					description: [
						`User: @${u.handle} (${u.id})`,
						`Email: \`${u.email ?? "None"}\``,
						"",
						`Reason: **${reason || "UNKNOWN"}**`
					].join("\n"),
					timestamp: new Date().toISOString()
				});
			});
		return i;
	}

	static generateToken() {
		return crypto.randomBytes(64).toString("hex");
	}
}

Verification.init();
