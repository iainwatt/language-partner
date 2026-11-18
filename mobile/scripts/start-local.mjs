import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve("expo/bin/cli"), "start", "--dev-client", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_NO_DOTENV: "1",
    EXPO_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-language-partner.firebaseapp.com",
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: "demo-language-partner",
    EXPO_PUBLIC_FIREBASE_APP_ID: "demo-language-partner-app",
    EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION: "europe-west2",
    EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: "127.0.0.1",
  },
});
child.on("exit", code => process.exit(code ?? 0));
