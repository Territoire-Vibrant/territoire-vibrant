/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as articles from "../articles.js";
import type * as contact from "../contact.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as leads from "../leads.js";
import type * as lib_effectRuntime from "../lib/effectRuntime.js";
import type * as lib_effectRuntimeNode from "../lib/effectRuntimeNode.js";
import type * as migrations from "../migrations.js";
import type * as products from "../products.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  articles: typeof articles;
  contact: typeof contact;
  "helpers/auth": typeof helpers_auth;
  leads: typeof leads;
  "lib/effectRuntime": typeof lib_effectRuntime;
  "lib/effectRuntimeNode": typeof lib_effectRuntimeNode;
  migrations: typeof migrations;
  products: typeof products;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
