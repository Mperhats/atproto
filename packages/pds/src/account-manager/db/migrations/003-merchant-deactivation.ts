import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('merchant')
    .addColumn('deactivatedAt', 'varchar')
    .execute()
  await db.schema
    .alterTable('merchant')
    .addColumn('deleteAfter', 'varchar')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('merchant').dropColumn('deactivatedAt').execute()
  await db.schema.alterTable('merchant').dropColumn('deleteAfter').execute()
}
