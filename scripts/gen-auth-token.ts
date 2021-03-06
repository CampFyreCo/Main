import { User } from "../src/db/models";

const handle = "admin",
	ip = "127.0.0.1",
	ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36";

void User
	.getUser({ handle })
	.then(async (u) => [u!, await u!.createAuthToken(ip, ua)])
	.then(([u, t]) => console.log(`Token: ${t.toString()}\nAuth: ${Buffer.from(`${(u as User).id}:${t.toString()}`).toString("base64")}`))
	.then(() => process.exit(0));
