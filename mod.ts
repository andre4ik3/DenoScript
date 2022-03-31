export const pwd = () => Deno.cwd();
export const cd = (d: string) => Deno.chdir(d);
export const exec = async (f: string, ...a: string[]) => {
  const cmd = a.length === 0 ? ["/bin/sh"] : [f, ...a];

  const stdin = "piped";
  const stdout = "piped";
  const stderr = "piped";

  const process = Deno.run({ cmd, stdin, stderr, stdout });

  if (a.length === 0) {
    const encoded = new TextEncoder().encode(f);
    await process.stdin.write(encoded);
    await process.stdin.close();
  }

  return process;
}

export const ls = async (d?: string) => {
  const dir = Deno.readDir(d || pwd());
  const dirs: Deno.DirEntry[] = [];
  for await (const member of dir) {
    dirs.push(member);
  }
  return dirs;
};

export const cat = async (f: string, e = "utf-8") => {
  const decoder = new TextDecoder(e);
  const data = await Deno.readFile(f);
  return decoder.decode(data);
};

export const isFile = async (f: string) => {
  try {
    await Deno.readFile(f);
    return true;
  } catch (_) {
    return false;
  }
}

export const isDir = async (d: string) => {
  try {
    await ls(d);
    return true;
  } catch (_) {
    return false;
  }
}

export const print = console.log;

export {PermissionManager} from "./permissions.ts";
