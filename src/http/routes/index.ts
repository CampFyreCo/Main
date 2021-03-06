import SessionStore from "../../util/SessionStore";
import express from "express";
import onFinished from "on-finished";

const app = express.Router();

app
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
	.use("/api", require("./api").default)
	.use(async (req, res, next) => {
		if (req.session.id) {
			req.data = SessionStore.get(req.session.id);
			onFinished(res, () =>
				SessionStore.set(req.sessionID, req.data)
			);
		}

		if (req.data.user === undefined) req.data.user = null;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		res.locals.user = req.data.user;

		return next();
	})
	.get("/", async (req, res) => res.render("index"));

export default app;
