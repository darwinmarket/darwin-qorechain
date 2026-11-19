// Copy the deployment record (addresses, roles, basket metadata) into the app.
// Run after every `npm run deploy` in ops/.
import { readFileSync, writeFileSync } from "node:fs";
const src = new URL("../../deployments/diana.json", import.meta.url);
const dst = new URL("../src/config/deployments.json", import.meta.url);
const d = JSON.parse(readFileSync(src, "utf8"));
delete d.steps;
writeFileSync(dst, JSON.stringify(d, null, 2) + "\n");
console.log("synced", Object.keys(d.baskets).join(", "));
