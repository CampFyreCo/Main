import { Server } from "../src/db/models";

process.nextTick(async () => {
	const srv = await Server.new({
		name: "Test Server",
		owner: "46428458451992576",
		vanityURL: "test",
		features: [
			"OFFICIAL",
			"VERIFIED",
			"VANITY_URL"
		]
	});
	console.log(srv);
});
