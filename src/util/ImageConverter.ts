import { MAX_IMAGE_SIZE, MIN_IMAGE_SIZE } from "./Constants/General";
import config from "../config";
import * as fs from "fs-extra";
import { Request, Response, NextFunction } from "express";
import ImageMagick from "imagemagick";
import FileType from "file-type";
import frames from "gif-frames";
import gifsicle from "gifsicle";
import { URL } from "url";
import path from "path";
import { execFileSync } from "child_process";

const ext = Object.values(config.mimes).reduce((a, b) => Array.isArray(b) ? [...a, ...b] : [...a, b], []) as Array<string>;
export default function ImageConverter(staticPath: string, cache: string) {
	return (async (req: Request, res: Response, next: NextFunction) => {
		const url = new URL(`http${req.secure ? "s" : ""}://${req.hostname}${req.originalUrl}`);
		if (!ext.some(e => url.pathname.endsWith(e))) return next();
		const f = path.basename(url.pathname.replace(/\/cdn/, "")).split(".");
		const fn = f.slice(0, -1).join(".");
		const pn = url.pathname.replace(/\/cdn/, "").split(fn)[0];
		const ex = f.slice(-1)[0];
		let p = `${staticPath}${pn}${fn}`;
		if (!fs.existsSync(p)) return res.status(404).end();
		// || because of NaN
		const size = Number(url.searchParams.get("size")) || 512;
		if (size < MIN_IMAGE_SIZE || size > MAX_IMAGE_SIZE || (Math.floor(Math.log2(size)) !== Math.ceil(Math.log2(size)))) return res.status(422).end();
		const rStat = fs.statSync(p);
		const cpath = `${cache}${pn}${fn}-${size}.${ex}`;
		fs.mkdirpSync(path.dirname(cpath));
		if (fs.existsSync(cpath)) {
			const nStat = fs.statSync(cpath);
			if (rStat.mtime.getTime() === nStat.mtime.getTime()) return res.status(200).sendFile(cpath);
		}

		const type = await FileType.fromFile(p);
		if (type === undefined) return res.status(500).end();
		if (type.mime === "image/gif" && ex !== "gif") {
			/* eslint-disable */
			await frames({ url: p, frames: 0, quality: 100 }).then((d: any) => {
				p = `${cache}${pn}${fn}-split.jpg`;
				d[0].getImage().pipe(fs.createWriteStream(p));
			});
			/* eslint-enable */
		}

		if (ex === "gif") execFileSync(gifsicle, ["--resize", `${size}x${size}`, "-o", cpath, p]);
		else {
			await new Promise((a, b) => ImageMagick.resize({
				format: ex,
				srcPath: p,
				dstPath: cpath,
				width: size,
				// it *can* be a string like this according to the cli version, the types are just
				// mismatched. The exclamation is required to not keep the aspect ratio
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				height: `${size}!`
			}, (err, r) => err ? b(err) : a(r)));
		}
		fs.utimesSync(cpath, rStat.atime, rStat.mtime);
		return res.status(200).sendFile(cpath);
	});
}
