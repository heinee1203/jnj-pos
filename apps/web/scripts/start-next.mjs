import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const port = process.env.PORT || "3011";
process.env.PORT = port;
process.env.HOSTNAME ||= "0.0.0.0";

const standaloneServer = join(".next", "standalone", "apps", "web", "server.js");
const useStandalone = existsSync(standaloneServer);
const command = useStandalone
  ? process.execPath
  : process.platform === "win32" ? "next.cmd" : "next";
const args = useStandalone
  ? [standaloneServer]
  : ["start", "--hostname", "0.0.0.0", "--port", port];

const child = spawn(command, args, {
  stdio: "inherit",
  shell: !useStandalone && process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
