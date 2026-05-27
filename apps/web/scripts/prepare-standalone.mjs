import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const standaloneAppDir = join(".next", "standalone", "apps", "web");

function copyIfExists(source, target) {
  if (!existsSync(source)) return;

  rmSync(target, { recursive: true, force: true });
  mkdirSync(join(target, ".."), { recursive: true });
  cpSync(source, target, { recursive: true });
}

if (existsSync(standaloneAppDir)) {
  copyIfExists(join(".next", "static"), join(standaloneAppDir, ".next", "static"));
  copyIfExists("public", join(standaloneAppDir, "public"));
}
