import config from "../config";
import express from "express";
import morgan from "morgan";
import session from "express-session";
import * as http from "http";
import * as https from "https";
const app = express();

app
	.set("view engine", "pug")
	.set("views", config.dir.views.templates)
	.use(session({
		name: "yiff",
		secret: config.http.secret,
		cookie: {
			domain: config.http.address,
			secure: true,
			httpOnly: true,
			maxAge: 8.64e7
		},
		resave: false,
		saveUninitialized: true
	}))
	.use(morgan("dev"))
	.use(express.json({
		limit: "30MB"
	}))
	.use(express.urlencoded({
		extended: true
	}))
	// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
	.use(require("./routes/index").default);

(config.http.secure ? https : http)
	.createServer(config.http.options, app)
	.listen(config.http.port, config.http.address, () => console.log(`Listening on http${config.http.secure ? "s" : ""}://${config.http.address}${[80, 443].includes(config.http.port) ? "" : `:${config.http.port}`}`));
