const permissions = ["env", "read", "write", "net", "run", "hrtime", "ffi"] as const;
type Permission = Deno.PermissionDescriptor;
type PermissionAll = PermissionName | "all";
type PermissionName = typeof permissions[number];

function desc(name: PermissionName, optional?: string): Permission {
  switch (name) {
    case "net": return { name, host: optional };
    case "run": return { name, command: optional };
    case "env": return { name, variable: optional };
    case "read" || "write" || "ffi": return { name, path: optional };
    default: return { name };
  }
}

export class PermissionManager {
  private static instance: PermissionManager;

  private permissions = new Map<string, Promise<boolean>>();
  private constructor() {}

  public static getInstance() {
    if (!this.instance) this.instance = new PermissionManager();
    return this.instance;
  }

  private async requestPermission(desc: Deno.PermissionDescriptor) {
    const req = await Deno.permissions.request(desc);
    return req.state === "granted";
  }

  private async query(desc: Deno.PermissionDescriptor) {
    const req = await Deno.permissions.query(desc);
    return req.state === "granted";
  }

  private pushPermission<T extends "*">(perm: T): Omit<this, PermissionAll>;
  private pushPermission<T extends Permission>(perm: T): Omit<this, T["name"]>
  private pushPermission<T extends Permission | "*">(perm: T) {
    if (perm === "*") {
      permissions.forEach((name) => {
        if (this.permissions.has(name)) return;
        this.permissions.set(name, this.requestPermission({ name }));
      });
    } else if (!this.permissions.has(perm.name)) {
      this.permissions.set(perm.name, this.requestPermission(perm));
    }
    return this
  }

  // Getting permissions
  all = () => this.pushPermission("*");
  env = (variable?: string) => this.pushPermission({ name: "env", variable });
  read = (path?: string) => this.pushPermission({ name: "read", path });
  write = (path?: string) => this.pushPermission({ name: "write", path });
  net = (host?: string) => this.pushPermission({ name: "net", host });
  run = (command?: string) => this.pushPermission({ name: "run", command });
  hrtime = () => this.pushPermission({ name: "hrtime" });
  ffi = (path?: string) => this.pushPermission({ name: "ffi", path });

  // Querying permissions
  async can(n: "hrtime"): Promise<boolean>;
  async can(n: "env" | "read" | "write" | "net" | "run" | "ffi", o?: string): Promise<boolean>;
  async can(n: PermissionName, o?: string) {
    return await this.query(desc(n as PermissionName, o))
  }

  /**
   * Waits for all permissions to be responded to.
   * @returns true if all permissions are granted, false otherwise.
   */
  async wait() {
    const promises = await Promise.all(this.permissions.values());
    return !promises.includes(false);
  }

  /** Throws an error if any permission is denied. */
  async ensure() {
    if (!await this.wait()) throw new Error("Permission denied");
  }
}
