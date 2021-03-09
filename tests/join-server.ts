import { User } from "../src/db/models";

process.nextTick(async () => {
	const u = await User.getUser({
		handle: "admin"
	});
	if (u === null) throw new TypeError("null");
});
