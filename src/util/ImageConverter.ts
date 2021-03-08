import config from "../config";
import * as fs from "fs-extra";
import { Request, Response, NextFunction } from "express";
import ImageMagick from "imagemagick";
import { URL } from "url";
import path from "path";

const ext = Object.values(config.mimes).reduce((a, b) => Array.isArray(b) ? [...a, ...b] : [...a, b], []) as Array<string>;
export default function ImageConverter(staticPath: string, cache: string) {
	return (async (req: Request, res: Response, next: NextFunction) => {
		const url = new URL(`http${req.secure ? "s" : ""}://${req.hostname}${req.originalUrl}`);
		if (!ext.some(e => url.pathname.endsWith(e))) return next();
		const f = path.basename(url.pathname.replace(/\/cdn/, "")).split(".");
		const fn = f.slice(0, -1).join(".");
		const pn = url.pathname.replace(/\/cdn/, "").split(fn)[0];
		console.log("pn", pn);
		const ex = f.slice(-1)[0];
		const p = `${staticPath}${pn}${fn}`;
		console.log("p", p);
		if (!fs.existsSync(p)) return res.status(404).end();
		// || because of NaN
		const size = Number(url.searchParams.get("size")) || 512;
		if (size > 4096 || size < 16 || (Math.floor(Math.log2(size)) !== Math.ceil(Math.log2(size)))) return res.status(422).end();
		const rStat = fs.statSync(p);
		const cpath = `${cache}${pn}${fn}-${size}.${ex}`;
		fs.mkdirpSync(path.dirname(cpath));
		if (fs.existsSync(cpath)) {
			const nStat = fs.statSync(cpath);
			if (rStat.mtime.getTime() === nStat.mtime.getTime()) return res.status(200).sendFile(cpath);
		}
		await new Promise((a, b) => ImageMagick.resize({
			format: ex,
			srcPath: p,
			dstPath: cpath,
			width: size
		}, (err, r) => err ? b(err) : a(r)));
		fs.utimesSync(cpath, rStat.atime, rStat.mtime);
		return res.status(200).sendFile(cpath);
	});
}
