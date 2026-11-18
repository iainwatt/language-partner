import * as SQLite from "expo-sqlite";
import { Repository } from "./repository";
let database: Promise<SQLite.SQLiteDatabase>;
async function db() {
  database ??= (async () => {
    const connection = await SQLite.openDatabaseAsync("language-partner.db");
    await connection.execAsync(
      "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
    );
    return connection;
  })();
  return database;
}
export const repository = new Repository({
  async get(key) {
    return (
      (
        await (
          await db()
        ).getFirstAsync<{ value: string }>(
          "SELECT value FROM app_data WHERE key = ?",
          key,
        )
      )?.value ?? null
    );
  },
  async set(key, value) {
    await (
      await db()
    ).runAsync(
      "INSERT INTO app_data (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      value,
    );
  },
});
