import { User } from "../db/models";
import { SessionStore as Store } from "@uwu-codes/utils";
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SessionData {
	user: User | null;
}

const SessionStore = new Store<SessionData>();
export { SessionData };
export default SessionStore;
