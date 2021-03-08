/* eslint-disable @typescript-eslint/triple-slash-reference, spaced-comment */
/// <reference path="../util/@types/Express.d.ts" />
import config from "../config";
import { SERVER as ServerErrors, CLIENT as ClientErrors } from "../util/Constants/Errors";
import ImageConverter from "../util/ImageConverter";
import { ALLOWED_METHODS } from "../util/Constants/General";
import express, { NextFunction } from "express";
import morgan from "morgan";
import session from "express-session";
import { AnyObject } from "@uwu-codes/utils";
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
		limit: "10MB"
	}))
	.use(express.urlencoded({
		extended: true
	}))
	.use(async (req, res, next) => {
		if (!ALLOWED_METHODS.includes(req.method.toUpperCase())) return res.status(405).json({
			success: false,
			error: ClientErrors.METHOD_NOT_ALLOWED
		});
		else return next();
	})
	.use("/cdn", ImageConverter(config.dir.static.cdn, `${config.dir.tmp}/.cache`))
	.use(express.static(config.dir.static.public))
	// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
	.use(require("./routes/index").default)
	.use(async (req, res) => res.status(404).end(`The path "${req.originalUrl}" was not found on this sever.`))
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	.use(async (err: Error & AnyObject<string | number>, req: express.Request, res: express.Response, next: NextFunction) => {
		if (err.type) {
			switch (err.type) {
				case "entity.too.large": return res.status(413).json({
					success: false,
					error: {
						code: 413,
						message: `Whatever you tried to upload was too large. You sent ${err.length.toLocaleString()} bytes. Keep it under ${err.limit.toLocaleString()} bytes.`
					}
				});
			}
		}
		console.log(err);
		return res.status(500).json({
			success: false,
			error: ServerErrors.UNKNOWN
		});
	});

(config.http.secure ? https : http)
	.createServer(config.http.options, app)
	.listen(config.http.port, config.http.address, () => console.log(`Listening on http${config.http.secure ? "s" : ""}://${config.http.address}${[80, 443].includes(config.http.port) ? "" : `:${config.http.port}`}`));
