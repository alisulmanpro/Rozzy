import {
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';

import { migrateDatabase } from './migrations';

const DATABASE_NAME = 'rozzy.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);

      try {
        await migrateDatabase(db);
        return db;
      } catch (error) {
        await db.closeAsync();
        throw error;
      }
    })().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}
