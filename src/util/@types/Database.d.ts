import {
	UserProperties,
	ServerProperties
} from "../../db/models";
import { DeepPartial, Nullable, SomeOptional } from "@uwu-codes/utils";

declare namespace Database {
	type GetUserOptions = DeepPartial<ServerProperties>;
	type GetServerOptions = DeepPartial<UserProperties>;

	type CreateServerOptions = Omit<Nullable<SomeOptional<ServerProperties, "name" | "owner">>, "id">;
	type CreateUserOptions = Omit<Nullable<SomeOptional<UserProperties, "name" | "handle">>, "id">;
}

export = Database;
