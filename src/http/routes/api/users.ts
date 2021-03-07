import { User } from "../../../db/models";
import { USER as UserErrors } from "../../../util/Constants/Errors";
import RateLimitHandler from "../../../util/handlers/RatelimitHandler";
import express from "express";

const app = express.Router();

app
	.get("/:id", RateLimitHandler.handle("GET_USER"), async (req, res) => {
		const u = await User.getUser({ id: req.params.id });
		if (u === null) {
			return res.status(404).json({
				success: false,
				error: UserErrors.UNKNOWN
			});
		} else {
			return res.status(200).json({
				success: true,
				data: u.toJSON(false)
			});
		}
	})
	.get("/@me", RateLimitHandler.handle("GET_SELF_USER"), async (req, res) => res.status(200).json({
		success: true,
		data: req.data.user!.toJSON(true)
	}))
	.patch("/@me", RateLimitHandler.handle("EDIT_SELF_USER"), async (req, res) => res.status(204).end());

export default app;
