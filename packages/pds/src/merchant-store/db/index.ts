import { DatabaseSchema } from './schema'
import { Database, Migrator } from '../../db'
import migrations from './migrations'
export * from './schema'

export type MerchantDb = Database<DatabaseSchema>

export const getDb = (
  location: string,
  disableWalAutoCheckpoint = false,
): MerchantDb => {
  const pragmas: Record<string, string> = disableWalAutoCheckpoint
    ? { wal_autocheckpoint: '0' }
    : {}
  return Database.sqlite(location, { pragmas })
}

export const getMigrator = (db: Database<DatabaseSchema>) => {
  return new Migrator(db.db, migrations)
}
