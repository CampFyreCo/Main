import { mdb } from "../src/db";
import { Invite, Server, User } from "../src/db/models";
import { USER_FLAGS } from "../src/util/Constants/General";

const drop = true;

async function setupChannels() {
	const col = mdb.collection("channels");
	if (!drop) await col.dropIndexes().then(() => console.log(`Dropped all of the indexes on \`${mdb.databaseName}\`.\`channels\`.`));
	await col.createIndexes([
		{
			name: "id",
			key: {
				id: 1
			},
			unique: true
		},
		{
			name: "serverId",
			key: {
				serverId: 1
			},
			unique: false
		},
		{
			name: "type",
			key: {
				type: 1
			},
			unique: false
		}
	]);
}

async function setupInvites() {
	const col = mdb.collection("invites");
	if (!drop) await col.dropIndexes().then(() => console.log(`Dropped all of the indexes on \`${mdb.databaseName}\`.\`invites\`.`));
	await col.createIndexes([
		{
			name: "id",
			key: {
				id: 1
			},
			unique: true
		},
		{
			name: "code",
			key: {
				code: 1
			},
			unique: true
		},
		{
			name: "serverId",
			key: {
				serverId: 1
			},
			unique: false
		},
		{
			name: "expire",
			key: {
				expire: 1
			},
			unique: false
		}
	]);
}

async function setupServers() {
	const col = mdb.collection("servers");
	if (!drop) await col.dropIndexes().then(() => console.log(`Dropped all of the indexes on \`${mdb.databaseName}\`.\`servers\`.`));
	await col.createIndexes([
		{
			name: "id",
			key: {
				id: 1
			},
			unique: true
		},
		{
			name: "name",
			key: {
				name: 1
			},
			unique: false
		},
		{
			name: "owner",
			key: {
				owner: 1
			},
			unique: false
		},
		{
			name: "vanityURL",
			key: {
				vanityURL: 1
			},
			unique: false
		}
	]);
}

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


	await setupChannels().then(() => console.log(`\`${mdb.databaseName}\`.\`channels\` setup successfully.`));
	await setupInvites().then(() => console.log(`\`${mdb.databaseName}\`.\`invites\` setup successfully.`));
	await setupServers().then(() => console.log(`\`${mdb.databaseName}\`.\`servers\` setup successfully.`));
	await setupUsers().then(() => console.log(`\`${mdb.databaseName}\`.\`users\` setup successfully.`));

	const user = await User.new({
		flags: USER_FLAGS.STAFF + USER_FLAGS.VERIFIED + USER_FLAGS.SYSTEM,
		handle: "admin",
		name: "Administrator",
		email: "hewwo@yiff.rocks",
		emailVerified: true
	}, "1").then(async (u) => {
		await u.setPassword("P@ssw0rd");
		console.log(`Added admin user (id: ${u.id})`);
		return u;
	});

	const token = await user.createAuthToken("0.0.0.0", undefined, "test");

	console.log("Admin Auth Token:", token);

	const srv = await Server.new({
		name: "Test Server",
		owner: user.id,
		vanityURL: "test",
		features: [
			"OFFICIAL",
			"VERIFIED",
			"VANITY_URL"
		]
	}, false, "2").then(async (s) => {
		console.log(`Added test server (id: ${s.id})`);
		return s;
	});

	await srv.addMember(user).then(() => console.log(`Added the user @${user.handle} (id: ${user.id}) to ${srv.name} (id: ${srv.id})`));

	const inv = await Invite.new({
		creator: user.id
	}, srv, "TEST");

	console.log("Invite Code:", inv.code);

	process.exit(0);
});
