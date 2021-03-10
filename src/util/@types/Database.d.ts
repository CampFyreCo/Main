import {
	ServerProperties,
	InviteProperties,
	UserProperties
} from "../../db/models";
import { DeepPartial, Nullable, SomeOptional } from "@uwu-codes/utils";

declare namespace Database {
	type GetInviteOptions = DeepPartial<InviteProperties>;
	type GetServerOptions = DeepPartial<ServerProperties>;
	type GetUserOptions = DeepPartial<UserProperties>;

	type CreateInviteOptions = Omit<Nullable<SomeOptional<InviteProperties>>, "id">;
	type CreateServerOptions = Omit<Nullable<SomeOptional<ServerProperties, "name" | "owner">>, "id">;
	type CreateUserOptions = Omit<Nullable<SomeOptional<UserProperties, "name" | "handle">>, "id">;
}

export = Database;
