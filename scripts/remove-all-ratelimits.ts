import { Redis } from "../src/db";

void Redis.keys("ratelimiting:*").then((k) => Redis.del(k)).then(() => console.log("done")).then(() => process.exit(0));
