import {
	UserProperties
} from "../../db/models";
import { DeepPartial, Nullable, SomeOptional } from "@uwu-codes/utils";

declare namespace Database {
	type GetUserOptions = DeepPartial<UserProperties>;

	type CreateUserOptions = Omit<Nullable<SomeOptional<UserProperties, "name" | "handle">>, "id">;
}

export = Database;
