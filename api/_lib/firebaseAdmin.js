import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function initAdmin() {
  if (admin.apps.length) return admin;

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    throw new Error("FIREBASE_DATABASE_URL is required for the payment server.");
  }

  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const localPath = join(__dirname, "..", "..", "serviceAccount.json");

  if (jsonRaw) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(jsonRaw)),
      databaseURL,
    });
  } else if (jsonPath && existsSync(jsonPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(readFileSync(jsonPath, "utf8"))),
      databaseURL,
    });
  } else if (existsSync(localPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(readFileSync(localPath, "utf8"))),
      databaseURL,
    });
  } else {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH, or add serviceAccount.json at project root."
    );
  }

  return admin;
}

export function getAdmin() {
  return initAdmin();
}
