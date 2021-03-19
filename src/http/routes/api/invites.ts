import RateLimitHandler from "../../../util/handlers/RatelimitHandler";
import Functions from "../../../util/Functions";
import { Invite, Server } from "../../../db/models";
import express from "express";

const app = express.Router();

app
	.get("/:code", RateLimitHandler.handle("GET_INVITE"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		const inv = await Invite.getInvite({ code: req.params.code.toUpperCase() });
		if (inv === null) return res.status(404).json({
			success: false,
			data: Functions.formatError("INVITE", "UNKNOWN")
		});

		return res.status(200).json({
			success: false,
			data: await inv.toJSON(true)
		});
	})
	.post("/:code/use", RateLimitHandler.handle("USE_INVITE"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		if (req.data.user.bot === true) return res.status(403).json({
			success: false,
			error: Functions.formatError("USER", "BOTS_CANNOT_USE_THIS_ENDPOINT")
		});

		const inv = await Invite.getInvite({ code: req.params.code.toUpperCase() });
		if (inv === null) return res.status(404).json({
			success: false,
			data: Functions.formatError("INVITE", "UNKNOWN")
		});
		if (req.data.user.inServer(req.params.id)) return res.status(409).json({
			success: false,
			data: Functions.formatError("USER", "ALREADY_IN_SERVER")
		});

		const srv = await Server.getServer({
			id: inv.serverId
		});

		if (srv === null) return res.status(404).json({
			success: false,
			error: Functions.formatError("SERVER", "UNKNOWN")
		});

		// @TODO ban check

		const add = await srv.addMember(req.data.user, inv.id);

		if (add === false) return res.status(500).json({
			success: false,
			error: Functions.formatError("INTERNAL", "UNKNOWN")
		});

		return res.status(200).json({
			success: false,
			data: srv.toJSON()
		});
	});

export default app;
