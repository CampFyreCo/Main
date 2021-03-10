import RateLimitHandler from "../../../util/handlers/RatelimitHandler";
import Functions from "../../../util/Functions";
import { PublicServer, Server, ServerMember } from "../../../db/models";
import express from "express";

const app = express.Router();

app
	.get("/:id", RateLimitHandler.handle("GET_SERVER"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		const srv = await Server.getServer(req.params.id);
		if (srv === null) return res.status(404).json({
			success: false,
			data: Functions.formatError("SERVER", "UNKNOWN")
		});
		if (!req.data.user.inServer(req.params.id)) return res.status(403).json({
			success: false,
			data: Functions.formatError("USER", "NO_ACCESS_SERVER")
		});

		const j = srv.toJSON() as PublicServer & { createdAt: string; members: Array<ServerMember>; };
		if (srv.members.length < 100) j.members = srv.members;
		else j.members = [];

		return res.status(200).json({
			success: false,
			data: srv.toJSON()
		});
	})
	// @TODO
	.patch("/:id", RateLimitHandler.handle("EDIT_SERVER"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		const srv = await Server.getServer(req.params.id);
		if (srv === null) return res.status(404).json({
			success: false,
			data: Functions.formatError("SERVER", "UNKNOWN")
		});
		if (!req.data.user.inServer(req.params.id)) return res.status(403).json({
			success: false,
			data: Functions.formatError("USER", "NO_ACCESS_SERVER")
		});
		// roles & permissions

		// I know this isn't what this status code is for, but I don't care
		return res.status(501).json({
			success: false,
			error: Functions.formatError("INTERNAL", "NOT_IMPLEMENTED")
		});
	})
	.delete("/:id", RateLimitHandler.handle("DELETE_SERVER"), async (req, res) => {
		if (!Functions.verifyUser(req, res, req.data.user)) return;
		const srv = await Server.getServer(req.params.id);
		if (srv === null) return res.status(404).json({
			success: false,
			data: Functions.formatError("SERVER", "UNKNOWN")
		});
		if (!req.data.user.inServer(req.params.id)) return res.status(403).json({
			success: false,
			data: Functions.formatError("USER", "NO_ACCESS_SERVER")
		});
	});

export default app;
