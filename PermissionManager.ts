import { Permission } from "./Permission.ts";

const permissions = ["env", "read", "write", "net", "run", "hrtime", "ffi"] as const;

// shorthands
type P = Deno.PermissionDescriptor;
type PAll = PName | "all" | "permission";
type PName = typeof permissions[number];
type MaybeArray<T> = T | T[];

/* Takes a permission name and optional value and converts to descriptor. */
function desc(name: PName, o?: string): P;
function desc(name: PName, o?: string[]): P[];
function desc(name: PName, o?: MaybeArray<string>): MaybeArray<P> {
  if (Array.isArray(o)) return o.map((v) => desc(name, v));
  else if (name !== "hrtime") return Permission[name](o);
  else return Permission[name]();
}

/**
 * Abstracts and simplifies permissions to make them easier to use.
 * Examples:
 * 
 * - Wait until permission to read config.toml and write test.log is granted,
 *   and throw an error if either was rejected
 * 
 *  ```ts
 *  const pm = PermissionManager.getInstance();
 *  await pm.read("config.toml").write("test.log").ensure();
 *  ```
 * 
 * - Wait until permission to get $HOME and $LANG is granted, save permission to
 *   an environment variable.
 * 
 *  ```ts
 *  const pm = PermissionManager.getInstance();
 *  const allowed = await pm.env(["HOME", "LANG"]).settle();
 *  if (allowed) console.log(Deno.env.get("HOME"), Deno.env.get("LANG"));
 *  else console.log("No permission.");
 *  ```
 */
export class PermissionManager {
  private constructor() {}
  private static instance: PermissionManager;
  private permissions = new Array<Promise<boolean>>();

  public static getInstance() {
    if (!this.instance) this.instance = new PermissionManager();
    return this.instance;
  }

  /**
   * Requests a permission internally.
   * @param desc The permission descriptor
   * @returns true if the permission has been granted.
   */
  private async requestPermission(desc: Deno.PermissionDescriptor) {
    const req = await Deno.permissions.request(desc);
    return req.state === "granted";
  }

  /**
   * Queries whether a permission has been granted internally.
   * @param desc The permission descriptor
   * @returns true if the permission has been granted.
   */
  private async query(desc: Deno.PermissionDescriptor) {
    const req = await Deno.permissions.query(desc);
    return req.state === "granted";
  }

  /**
   * Takes either * or a permission to request. In the case of *, it will
   * request every permission. Returns immediately, permission is requested
   * in the background.
   * @param perm Permission to request or *
   */
  private pushPermission<T extends "*">(perm: T): Omit<this, PAll>;
  private pushPermission<T extends P>(perm: T): Omit<this, T["name"]>;
  private pushPermission<T extends P | "*">(perm: T) {
    if (perm === "*") {
      permissions.forEach((name) => {
        this.permissions.push(this.requestPermission({ name }));
      });
    } else this.permissions.push(this.requestPermission(perm));
    return this;
  }

  /**
   * Requests a single permission.
   * @param name The permission name to request.
   * @param o Either single option or array of options to pass to the request.
   * @returns PermissionManager so you can chain it.
   */
  permission(name: PName, o?: MaybeArray<string>): this {
    if (Array.isArray(o)) o.map((v) => this.pushPermission(desc(name, v)));
    else this.pushPermission(desc(name, o));
    return this;
  }

  // Shorthands
  all = () => this.pushPermission("*");
  env = (v?: MaybeArray<string>) => this.permission("env", v);
  read = (v?: MaybeArray<string>) => this.permission("read", v);
  write = (v?: MaybeArray<string>) => this.permission("write", v);
  net = (v?: MaybeArray<string>) => this.permission("net", v);
  run = (v?: MaybeArray<string>) => this.permission("run", v);
  ffi = (v?: MaybeArray<string>) => this.permission("ffi", v);
  hrtime = () => this.permission("hrtime");

  /**
   * Queries whether a permission has been granted.
   * @param n The permission name to query.
   * @param o Optionally, pass parameter(s) to the descriptor (e.g. path).
   */
  async can(n: Omit<PName, "hrtime">, o?: MaybeArray<string>): Promise<boolean>;
  async can(n: "hrtime"): Promise<boolean>;
  async can(n: PName, o?: MaybeArray<string>) {
    if (Array.isArray(o)) {
      const promises = o.map(v => this.can(n, v));
      return (await Promise.all(promises)).includes(false);
    }
    return await this.query(desc(n as PName, o));
  }

  /**
   * Waits for all permissions to be responded to. Does not throw any errors.
   * @returns true if all permissions are granted, false otherwise.
   */
  async settle() {
    const promises = await Promise.all(this.permissions.values());
    return !promises.includes(false);
  }

  /** Throws an error if any permission is denied. */
  async ensure() {
    if (!(await this.settle())) throw new Error("Permission denied");
  }
}
