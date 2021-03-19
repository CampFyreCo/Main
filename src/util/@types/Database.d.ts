import {
	ChannelProperties,
	ServerProperties,
	InviteProperties,
	UserProperties
} from "../../db/models";
import { DeepPartial, Nullable, SomeOptional } from "@uwu-codes/utils";

declare namespace Database {
	type GetChannelOptions = DeepPartial<ChannelProperties>;
	type GetInviteOptions = DeepPartial<InviteProperties>;
	type GetServerOptions = DeepPartial<ServerProperties>;
	type GetUserOptions = DeepPartial<UserProperties>;

	type CreateChannelOptions = Omit<Nullable<SomeOptional<ChannelProperties, "name" | "type">>, "id" | "serverId">;
	type CreateInviteOptions = Omit<Nullable<SomeOptional<InviteProperties>>, "id" | "serverId">;
	type CreateServerOptions = Omit<Nullable<SomeOptional<ServerProperties, "name" | "owner">>, "id">;
	type CreateUserOptions = Omit<Nullable<SomeOptional<UserProperties, "name" | "handle">>, "id">;
}

export = Database;
