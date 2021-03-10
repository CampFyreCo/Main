import Templater from "./Templater";
import Verification from "./Verification";
import config from "../../../config";
import { User } from "../../../db/models";
import { Colors } from "../../Constants/General";
import Logger from "../../Logger";
import WebhookHandler from "../WebhookHandler";
import NodeMailer from "nodemailer";

interface SendResponse {
	accepted: Array<string>;
	rejected: Array<string>;
	envelopeTime: number;
	messageTime: number;
	messageSize: number;
	response: string;
	envelope: {
		from: string;
		to: Array<string>;
	};
	messageId: string;
}

export default class Mailer {
	static transport = NodeMailer.createTransport(config.services.smtp.url);

	static async send(to: string, subject: string, html: string) {
		return new Promise<SendResponse>((a, b) =>
			this.transport.sendMail({
				from: config.services.smtp.from,
				to,
				subject,
				html
			}, (err, res) => err ? b(err) : a(res))
		)
			.then(async (res) => {
				Logger.debug("Mailer->send", `${res.rejected.length === 0 ? "Successful" : "Unsuccessful"} send attempt to "${res.envelope.to.join("\", \"")}", from "${res.envelope.from}". Message ID: ${res.messageId}`);

				await WebhookHandler.executeDiscord("email", {
					title: "Email Sent",
					color: res.rejected.length === 0 ? Colors.green : Colors.red,
					description: [
						`Successful: ${res.rejected.length === 0 ? "Yes" : "No"}`,
						`From: \`${config.services.smtp.from}\``,
						`To: \`${to}\``,
						`Subject Length: **${subject.length}**`,
						`Body Length: **${html.length}**`
					].join("\n"),
					timestamp: new Date().toISOString()
				});

				return res;
			});
	}

	static async sendConfirmation(user: User | string) {
		if (!User.isUser(user)) {
			const v = await User.getUser(user);
			if (v === null) return false;
			user = v;
		}
		const t = Templater.get("confirm");
		if (t === undefined) throw new TypeError("Faled to fetch email confirmation template.");
		if (user.email === null) throw new TypeError(`[Mailer->sendConfirmation] User does not have an email address saved. (U-${user.id})`);
		const { token } = Verification.add(user.email, user.id);
		return this.send(
			user.email,
			Templater.parseString(t.content.subject, {
				NAME: user.name,
				HANDLE: user.handle,
				EMAIL: user.email,
				TOKEN: token,
				URL: `${config.http.web.api}/confirm-email?token=${token}`
			}),
			Templater.parseString(t.content.body, {
				NAME: user.name,
				HANDLE: user.handle,
				EMAIL: user.email,
				TOKEN: token,
				URL: `${config.http.web.api}/confirm-email?token=${token}`
			})
		).then(({ rejected: { length } }) => length === 0);
	}
}
