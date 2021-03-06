import AuthHandler from "../../../util/AuthHandler";
import express from "express";

const app = express.Router();

app
	.use(async (req, res, next) => {
		// we don't keep this data across sessions, but we do still need a place to store it
		req.data = {
			user: null
		};

		return next();
	})
	.use(AuthHandler.handle())
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
	.use("/users", require("./users").default);

export default app;
