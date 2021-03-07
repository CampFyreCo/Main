import Logger from "./Logger";
import config from "../config";
import * as fs from "fs-extra";

export default function DirectoryStructureCheck() {
	const dir = [
		config.dir.logs,
		config.dir.static.base,
		config.dir.static.avatar,
		config.dir.config.extra
	];

	dir.map((d) => {
		if (!fs.existsSync(d)) {
			fs.mkdirpSync(d);
			Logger.debug("Directory Structure Check", `Created directory "${d}"`);
		}
	});
}
