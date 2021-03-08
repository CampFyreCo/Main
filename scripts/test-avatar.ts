import * as fs from "fs-extra";
import fetch from "node-fetch";
const f = fs.readFileSync("/home/donovan/Downloads/26529308.jpg").toString("base64");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
void fetch("https://fyre.local/api/users/@me", {
	method: "PATCH",
	headers: {
		"Authorization": "Basic NDY0Mjg0NTg0NTE5OTI1NzY6MDE5ZjA4ZmM4MjI3ODhkMDkzYjA4NmY3NmRjMmEwNThlZWJlYTk0MWEzNTU5ZTdiNzUyNzI1ODZjOWM5MzI5MA==",
		"Content-Type": "application/json"
	},
	body: JSON.stringify({
		avatar: f,
		password: "P@ssw0rd"
	})
}).then((res) => res.json()).then(console.log);
