import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('list_block')
    .addColumn('uri', 'varchar', (col) => col.primaryKey())
    .addColumn('cid', 'varchar', (col) => col.notNull())
    .addColumn('creator', 'varchar', (col) => col.notNull())
    .addColumn('subjectUri', 'varchar', (col) => col.notNull())
    .addColumn('createdAt', 'varchar', (col) => col.notNull())
    .addColumn('indexedAt', 'varchar', (col) => col.notNull())
    .addUniqueConstraint('list_block_unique_subject', ['creator', 'subjectUri'])
    .execute()

  await db.schema
    .createIndex('list_block_subject_idx')
    .on('list_block')
    .column('subjectUri')
    .execute()

  // missed index in `actor-block-init` migration
  await db.schema
    .createIndex('actor_block_creator_idx')
    .on('actor_block')
    .column('creator')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('actor_block_creator_idx').execute()
  await db.schema.dropTable('list_block').execute()
}
