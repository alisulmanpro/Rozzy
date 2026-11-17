import type { SQLiteDatabase } from 'expo-sqlite';

import {
  DATABASE_VERSION,
  INITIAL_SCHEMA_SQL,
} from './schema';

export async function migrateDatabase(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionResult = await db.getFirstAsync<{
    user_version: number;
  }>('PRAGMA user_version;');

  const currentVersion = versionResult?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}.`,
    );
  }

  if (currentVersion === DATABASE_VERSION) {
    return;
  }

  await db.withTransactionAsync(async () => {
    let version = currentVersion;

    if (version === 0) {
      await db.execAsync(INITIAL_SCHEMA_SQL);
      version = 1;
    }

    await db.execAsync(`PRAGMA user_version = ${version};`);
  });
}
