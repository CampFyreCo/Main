import { SessionData as Data } from "../SessionStore";
import "express";

declare global {
	namespace Express {
		interface Request {
			data: Partial<Data>;
		}
	}
}
