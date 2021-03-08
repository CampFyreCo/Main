/* type ConnectionProperty = "noVerification" | "verificationRequired" | "noLink";

interface Connection {
	url: string | null;
	properties: Array<ConnectionProperty>;
	validationRegex: RegExp;
} */

export default class ConnectionsHandler {
	/* static LIST = new Map<string, Connection>();
	static register(name: string, url: string | null, properties: Array<ConnectionProperty>, validationRegex: RegExp) {
		this.LIST.set(name, {
			url,
			properties,
			validationRegex
		});
	} */
	static VALID = [
		"twitter"
	] as const;
}
