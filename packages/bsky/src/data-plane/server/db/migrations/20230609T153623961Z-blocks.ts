import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('actor_block')
    .addColumn('uri', 'varchar', (col) => col.primaryKey())
    .addColumn('cid', 'varchar', (col) => col.notNull())
    .addColumn('creator', 'varchar', (col) => col.notNull())
    .addColumn('subjectDid', 'varchar', (col) => col.notNull())
    .addColumn('createdAt', 'varchar', (col) => col.notNull())
    .addColumn('indexedAt', 'varchar', (col) => col.notNull())
    .addColumn('sortAt', 'varchar', (col) =>
      col
        .generatedAlwaysAs(sql`least("createdAt", "indexedAt")`)
        .stored()
        .notNull(),
    )
    .addUniqueConstraint('actor_block_unique_subject', [
      'creator',
      'subjectDid',
    ])
    .execute()
  await db.schema
    .createIndex('actor_block_subjectdid_idx')
    .on('actor_block')
    .column('subjectDid')
    .execute()

  
  await db.schema
    .createTable('merchant_block')
    .addColumn('uri', 'varchar', (col) => col.primaryKey())
    .addColumn('cid', 'varchar', (col) => col.notNull())
    .addColumn('creator', 'varchar', (col) => col.notNull())
    .addColumn('subjectDid', 'varchar', (col) => col.notNull())
    .addColumn('createdAt', 'varchar', (col) => col.notNull())
    .addColumn('indexedAt', 'varchar', (col) => col.notNull())
    .addColumn('sortAt', 'varchar', (col) =>
      col
        .generatedAlwaysAs(sql`least("createdAt", "indexedAt")`)
        .stored()
        .notNull(),
    )
    .addUniqueConstraint('merchant_block_unique_subject', [
      'creator',
      'subjectDid',
    ])
    .execute()
  await db.schema
    .createIndex('merchant_block_subjectdid_idx')
    .on('merchant_block')
    .column('subjectDid')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('actor_block_subjectdid_idx').execute()
  await db.schema.dropTable('actor_block').execute()
  await db.schema.dropIndex('merchant_block_subjectdid_idx').execute()
  await db.schema.dropTable('merchant_block').execute()
}
