import { mdb } from "../src/db";
import { User } from "../src/db/models";
import { USER_FLAGS } from "../src/util/Constants/General";

const drop = true;

async function setupUsers() {
	const col = mdb.collection("users");
	if (!drop) await col.dropIndexes().then(() => console.log(`Dropped all of the indexes on \`${mdb.databaseName}\`.\`users\`.`));
	await col.createIndexes([
		{
			name: "id",
			key: {
				id: 1
			},
			unique: true
		},
		{
			name: "handle",
			key: {
				handle: 1
			},
			unique: true
		},
		{
			name: "email",
			key: {
				email: 1
			},
			unique: true,
			partialFilterExpression: {
				email: {
					$type: "string"
				}
			}
		},
		{
			name: "authTokens.token",
			key: {
				"authTokens.token": 1
			},
			unique: true,
			partialFilterExpression: {
				"authTokens.token": {
					$type: "string"
				}
			}
		},
		{
			name: "name",
			key: {
				name: 1
			},
			unique: false
		}
	]);
}

process.nextTick(async () => {
	if (drop) {
		console.log(`This WILL drop the \`${mdb.databaseName}\` database, exit within 5 seconds to cancel!`);
		await new Promise((a) => setTimeout(a, 5e3));
		console.log("Continuing..");
		await mdb.dropDatabase();
	}


	await setupUsers().then(() => console.log(`\`${mdb.databaseName}\`.\`users\` setup successfully.`));

	await User.new({
		flags: USER_FLAGS.STAFF + USER_FLAGS.ADMIN,
		handle: "admin",
		name: "Administrator",
		email: "hewwo@yiff.rocks",
		emailVerified: true
	}).then(async (u) => {
		await u.setPassword("P@ssw0rd");
		console.log(`Added admin user (id: ${u.id})`);
	});

	process.exit(0);
});
