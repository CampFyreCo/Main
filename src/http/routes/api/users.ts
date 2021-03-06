import { User } from "../../../db/models";
import { USER as UserErrors } from "../../../util/Errors";
import express from "express";

const app = express.Router();

app
	.get("/:id", async (req, res) => {
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
	});

export default app;
