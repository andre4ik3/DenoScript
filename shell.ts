export async function $(strings, ...values) {
  const cmdline = strings
    .map((str, i) => str + (values[i] || ''))
    .join("");

  const shell = Deno.env.get("SHELL");
  const command = new Deno.Command(shell, {
    args: ["-c", cmdline],
  });

  return await command.output();
}
