import { Invite } from "../src/db/models";
import Server from "../src/db/models/Server";

void Server.getServer({ id: "50007533082902528" }).then(async (srv) => {
	if (srv === null) throw new TypeError("null");
	const inv = await Invite.new({}, srv);
	console.log(inv.code);

	process.exit(0);
});
