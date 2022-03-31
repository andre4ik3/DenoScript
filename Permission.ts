// Helpers
type MaybeArray<T> = T | T[];
type P = Deno.PermissionDescriptor;

/**
 * "Namespace" that provides functions to create permission descriptors
 * from permission names (and optionally variables).
 */
export class Permission {
  static env(variable?: string): P
  static env(variable?: string[]): P[]
  static env(variable?: MaybeArray<string>): MaybeArray<P> {
    if (Array.isArray(variable)) return variable.map(v => this.env(v));
    return { name: "env", variable };
  }

  static read(path?: string | URL): P
  static read(path?: (string | URL)[]): P[]
  static read(path?: MaybeArray<string | URL>): MaybeArray<P> {
    if (Array.isArray(path)) return path.map(p => this.read(p));
    return { name: "read", path };
  }

  static write(path?: string | URL): P
  static write(path?: (string | URL)[]): P[]
  static write(path?: MaybeArray<string | URL>): MaybeArray<P> {
    if (Array.isArray(path)) return path.map(p => this.write(p));
    return { name: "write", path };
  }

  static net(host?: string): P
  static net(host?: string[]): P[]
  static net(host?: MaybeArray<string>): MaybeArray<P> {
    if (Array.isArray(host)) return host.map(h => this.net(h));
    return { name: "net", host };
  }

  static run(cmd?: string): P
  static run(cmd?: string[]): P[]
  static run(cmd?: MaybeArray<string>): MaybeArray<P> {
    if (Array.isArray(cmd)) return cmd.map(c => this.run(c));
    return { name: "run", command: cmd };
  }

  static ffi(path?: string | URL): P
  static ffi(path?: (string | URL)[]): P[]
  static ffi(path?: MaybeArray<string | URL>): MaybeArray<P> {
    if (Array.isArray(path)) return path.map(p => this.ffi(p));
    return { name: "ffi", path };
  }

  static hrtime(): P {
    return { name: "hrtime" };
  }
}
