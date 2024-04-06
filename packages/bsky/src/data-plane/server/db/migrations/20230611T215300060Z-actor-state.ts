import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('actor_state')
    .addColumn('did', 'varchar', (col) => col.primaryKey())
    .addColumn('lastSeenNotifs', 'varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('merchant_state')
    .addColumn('did', 'varchar', (col) => col.primaryKey())
    .addColumn('lastSeenNotifs', 'varchar', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('actor_state').execute()
  await db.schema.dropTable('merchant_state').execute()
}
