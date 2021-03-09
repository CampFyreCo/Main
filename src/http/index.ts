/* eslint-disable @typescript-eslint/triple-slash-reference, spaced-comment */
/// <reference path="../util/@types/Express.d.ts" />
import config from "../config";
import ImageConverter from "../util/ImageConverter";
import { ALLOWED_METHODS } from "../util/Constants/General";
import Functions from "../util/Functions";
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
		if (!ALLOWED_METHODS.includes(req.method.toUpperCase() as (typeof ALLOWED_METHODS)[number])) return res.status(405).json({
			success: false,
			error: Functions.formatError("CLIENT", "METHOD_NOT_ALLOWED", {
				METHOD: req.method.toUpperCase()
			})
		});
		else return next();
	})
	.use("/cdn", ImageConverter(config.dir.static.cdn, `${config.dir.tmp}/.cache`))
	.use(express.static(config.dir.static.public))
	// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
	.use(require("./routes/index").default)
	.use(async (req, res) => req.originalUrl.toLowerCase().startsWith("/api") ? res.status(404).json({ success: false, error: Functions.formatError("CLIENT", "NOT_FOUND", { PATH: req.originalUrl.split("?")[0] }) }) : res.status(404).render("errors/404", { path: req.originalUrl }))
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	.use(async (err: Error & AnyObject<string | number>, req: express.Request, res: express.Response, next: NextFunction) => {
		const api = req.originalUrl.toLowerCase().startsWith("/api");
		if (err.type) {
			switch (err.type) {
				case "entity.too.large": return res.status(413).json({
					success: false,
					error: Functions.formatError("SERVER", "TOO_LARGE", {
						LENGTH: err.length.toLocaleString(),
						MAX: err.limit.toLocaleString()
					})
				});
			}
		}
		console.log(err);
		if (api) return res.status(500).json({
			success: false,
			error: Functions.formatError("SERVER", "UNKNOWN")
		});
		else return res.status(500).render("errors/500");
	});

(config.http.secure ? https : http)
	.createServer(config.http.options, app)
	.listen(config.http.port, config.http.address, () => console.log(`Listening on http${config.http.secure ? "s" : ""}://${config.http.address}${[80, 443].includes(config.http.port) ? "" : `:${config.http.port}`}`));
