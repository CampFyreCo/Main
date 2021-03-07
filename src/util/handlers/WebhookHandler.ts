import config from "../../config";
import Eris from "eris";

export default class WebhookHandler {
	static client = new Eris.Client("No");

	static async executeDiscord(type: keyof typeof config["discordWebhooks"], content: Eris.EmbedOptions) {
		return this.client.executeWebhook(config.discordWebhooks[type].id, config.discordWebhooks[type].token, {
			embeds: [
				content
			]
		});
	}
}
