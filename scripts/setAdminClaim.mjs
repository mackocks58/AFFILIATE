/**
 * One-time: grant Firebase Auth admin custom claim for Storage + RTDB rules.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json ADMIN_UID=<firebase_auth_uid> node scripts/setAdminClaim.mjs
 */
import "dotenv/config";
import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const uid = process.env.ADMIN_UID;
if (!uid) {
  console.error("Set ADMIN_UID to the Firebase Authentication user id.");
  process.exit(1);
}

const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || join(root, "serviceAccount.json");
if (!existsSync(jsonPath)) {
  console.error("Missing service account JSON at", jsonPath);
  process.exit(1);
}

const cred = JSON.parse(readFileSync(jsonPath, "utf8"));
admin.initializeApp({
  credential: admin.credential.cert(cred),
});

await admin.auth().setCustomUserClaims(uid, { admin: true });
console.log("Admin claim set for", uid);
process.exit(0);
