import { User } from "../src/db/models";
import * as MFA from "node-2fa";

void User.getUser({
	handle: "admin"
}).then(async (u) => {
	if (u === null) throw new TypeError("null");
	const f = await u.enableMFA();
	if (f === null) {
		const pv = u.mfaVerified;
		const code = MFA.generateToken(u.mfaSecret!);
		const v = await u.verifyMFA(code!.token);
		console.log("Secret:", u.mfaSecret);
		console.log("Code:", code!.token);
		if (!pv && v) console.log("MFA Verified");
		else {
			if (!v) console.log("MFA No Match");
			else console.log("MFA Match");
		}
		process.exit(0);
		return;
	}
	console.log(f.qr);
	console.log(f.secret);
	process.exit(0);
});
