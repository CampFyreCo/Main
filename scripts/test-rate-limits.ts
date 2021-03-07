import RateLimitHandler from "../src/util/handlers/RatelimitHandler";

process.nextTick(async () => {
	for (let i = 1; i < Infinity; i++) {
		console.log("Round #", i);
		const c1 = await RateLimitHandler.get("EDIT_SELF_USER", "46428458451992576");
		console.log("start", c1);

		for (let ii = 1; ii <= 3; ii++) await RateLimitHandler.consume("EDIT_SELF_USER", "46428458451992576");
		const c2 = await RateLimitHandler.get("EDIT_SELF_USER", "46428458451992576");
		console.log("end", c2);
		await new Promise((a) => setTimeout(a, 5e3));
	}
	process.exit(0);
});
