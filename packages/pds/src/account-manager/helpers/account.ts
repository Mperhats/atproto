import { Database, isErrUniqueViolation, notSoftDeletedClause } from '../../db'
import { AccountDb, ActorEntry, MerchantEntry } from '../db'
import { StatusAttr } from '../../lexicon/types/com/atproto/admin/defs'
import { DAY } from '@atproto/common'
import { sql } from 'kysely'

export class UserAlreadyExistsError extends Error {}

export type ActorAccount = ActorEntry & {
  email: string | null
  emailConfirmedAt: string | null
  invitesDisabled: 0 | 1 | null
}

export type MerchantAccount = MerchantEntry & {
  email: string | null
  emailConfirmedAt: string | null
  invitesDisabled: 0 | 1 | null
}

export type AvailabilityFlags = {
  includeTakenDown?: boolean
  includeDeactivated?: boolean
}

// MERCHANT ACCOUNTS
const selectMerchantAccountQB = (db: AccountDb, flags?: AvailabilityFlags) => {
  const { includeTakenDown = false, includeDeactivated = false } = flags ?? {}
  const { ref } = db.db.dynamic
  return db.db
    .selectFrom('merchant')
    .leftJoin('account', 'merchant.did', 'account.did')
    .if(!includeTakenDown, (qb) => qb.where(notSoftDeletedClause(ref('merchant'))))
    .if(!includeDeactivated, (qb) =>
      qb.where('merchant.deactivatedAt', 'is', null),
    )
    .select([
      'merchant.did',
      'merchant.handle',
      'merchant.createdAt',
      'merchant.takedownRef',
      'merchant.deactivatedAt',
      'merchant.deleteAfter',
      'account.email',
      'account.emailConfirmedAt',
      'account.invitesDisabled',
    ])
}

async function logFirstFourRowsOfMerchants(db:AccountDb) {
  const merchantRows = await db.db
    .selectFrom('merchant')
    .selectAll()
    .limit(4)
    .execute()
  console.log('First 4 rows of Merchant table:', merchantRows)
}

// Function to log the first four rows of the actor table
async function logFirstFourRowsOfActors(db:AccountDb) {
  const count = await db.db
  .selectFrom('actor') // Assuming the 'actor' table is present
  .select(sql`COUNT(*)`.as('rowCount'))
  .executeTakeFirst();
  console.log('First 4 rows of Actor table:', count)
}

export const registerMerchant = async (
  db: AccountDb,
  opts: {
    did: string
    handle: string
    deactivated?: boolean
  },
) => {
  const { did, handle, deactivated } = opts
  const now = Date.now()
  const createdAt = new Date(now).toISOString()
  const [registered] = await db.executeWithRetry(
    db.db
      .insertInto('merchant')
      .values({
        did,
        handle,
        createdAt,
        deactivatedAt: deactivated ? createdAt : null,
        deleteAfter: deactivated ? new Date(now + 3 * DAY).toISOString() : null,
      })
      .onConflict((oc) => oc.doNothing())
      .returning('did'),
  )

  const [registeredActor] = await db.executeWithRetry(
    db.db
      .insertInto('actor')
      .values({
        did,
        handle,
        createdAt,
        deactivatedAt: deactivated ? createdAt : null,
        deleteAfter: deactivated ? new Date(now + 3 * DAY).toISOString() : null,
      })
      .onConflict((oc) => oc.doNothing())
      .returning('did'),
  )

  logFirstFourRowsOfActors(db)
  logFirstFourRowsOfMerchants(db)

  console.log('registered new account into merchant db...',registered)

  if (!registered) {
    throw new UserAlreadyExistsError()
  }
}

export const getMerchantAccount = async (
  db: AccountDb,
  handleOrDid: string,
  flags?: AvailabilityFlags,
): Promise<MerchantAccount | null> => {
  const found = await selectMerchantAccountQB(db, flags)
    .where((qb) => {
      if (handleOrDid.startsWith('did:')) {
        return qb.where('merchant.did', '=', handleOrDid)
      } else {
        return qb.where('merchant.handle', '=', handleOrDid)
      }
    })
    .executeTakeFirst()
  return found || null
}


// ACTOR ACCOUNTS
const selectAccountQB = (db: AccountDb, flags?: AvailabilityFlags) => {
  const { includeTakenDown = false, includeDeactivated = false } = flags ?? {}
  const { ref } = db.db.dynamic
  return db.db
    .selectFrom('actor')
    .leftJoin('account', 'actor.did', 'account.did')
    .if(!includeTakenDown, (qb) => qb.where(notSoftDeletedClause(ref('actor'))))
    .if(!includeDeactivated, (qb) =>
      qb.where('actor.deactivatedAt', 'is', null),
    )
    .select([
      'actor.did',
      'actor.handle',
      'actor.createdAt',
      'actor.takedownRef',
      'actor.deactivatedAt',
      'actor.deleteAfter',
      'account.email',
      'account.emailConfirmedAt',
      'account.invitesDisabled',
    ])
}

export const registerActor = async (
  db: AccountDb,
  opts: {
    did: string
    handle: string
    deactivated?: boolean
  },
) => {
  const { did, handle, deactivated } = opts
  const now = Date.now()
  const createdAt = new Date(now).toISOString()
  const [registered] = await db.executeWithRetry(
    db.db
      .insertInto('actor')
      .values({
        did,
        handle,
        createdAt,
        deactivatedAt: deactivated ? createdAt : null,
        deleteAfter: deactivated ? new Date(now + 3 * DAY).toISOString() : null,
      })
      .onConflict((oc) => oc.doNothing())
      .returning('did'),
  )
  if (!registered) {
    throw new UserAlreadyExistsError()
  }
}

export const getAccount = async (
  db: AccountDb,
  handleOrDid: string,
  flags?: AvailabilityFlags,
): Promise<ActorAccount | null> => {
  const found = await selectAccountQB(db, flags)
    .where((qb) => {
      if (handleOrDid.startsWith('did:')) {
        return qb.where('actor.did', '=', handleOrDid)
      } else {
        return qb.where('actor.handle', '=', handleOrDid)
      }
    })
    .executeTakeFirst()
  return found || null
}

// 
export const getAccountByEmail = async (
  db: AccountDb,
  email: string,
  flags?: AvailabilityFlags,
): Promise<ActorAccount | null> => {
  const found = await selectAccountQB(db, flags)
    .where('email', '=', email.toLowerCase())
    .executeTakeFirst()
  return found || null
}

export const registerAccount = async (
  db: AccountDb,
  opts: {
    did: string
    email: string
    passwordScrypt: string
  },
) => {
  const { did, email, passwordScrypt } = opts
  const [registered] = await db.executeWithRetry(
    db.db
      .insertInto('account')
      .values({
        did,
        email: email.toLowerCase(),
        passwordScrypt,
      })
      .onConflict((oc) => oc.doNothing())
      .returning('did'),
  )
  if (!registered) {
    throw new UserAlreadyExistsError()
  }
}

export const deleteAccount = async (
  db: AccountDb,
  did: string,
): Promise<void> => {
  // Not done in transaction because it would be too long, prone to contention.
  // Also, this can safely be run multiple times if it fails.
  await db.executeWithRetry(
    db.db.deleteFrom('repo_root').where('did', '=', did),
  )
  await db.executeWithRetry(
    db.db.deleteFrom('email_token').where('did', '=', did),
  )
  await db.executeWithRetry(
    db.db.deleteFrom('refresh_token').where('did', '=', did),
  )
  await db.executeWithRetry(
    db.db.deleteFrom('account').where('account.did', '=', did),
  )
  await db.executeWithRetry(
    db.db.deleteFrom('actor').where('actor.did', '=', did),
  )
}

export const updateHandle = async (
  db: AccountDb,
  did: string,
  handle: string,
) => {
  const [res] = await db.executeWithRetry(
    db.db
      .updateTable('actor')
      .set({ handle })
      .where('did', '=', did)
      .whereNotExists(
        db.db.selectFrom('actor').where('handle', '=', handle).selectAll(),
      ),
  )
  if (res.numUpdatedRows < 1) {
    throw new UserAlreadyExistsError()
  }
}

export const updateEmail = async (
  db: AccountDb,
  did: string,
  email: string,
) => {
  try {
    await db.executeWithRetry(
      db.db
        .updateTable('account')
        .set({ email: email.toLowerCase(), emailConfirmedAt: null })
        .where('did', '=', did),
    )
  } catch (err) {
    if (isErrUniqueViolation(err)) {
      throw new UserAlreadyExistsError()
    }
    throw err
  }
}

export const setEmailConfirmedAt = async (
  db: AccountDb,
  did: string,
  emailConfirmedAt: string,
) => {
  await db.executeWithRetry(
    db.db
      .updateTable('account')
      .set({ emailConfirmedAt })
      .where('did', '=', did),
  )
}

export const getAccountTakedownStatus = async (
  db: AccountDb,
  did: string,
): Promise<StatusAttr | null> => {
  const res = await db.db
    .selectFrom('actor')
    .select('takedownRef')
    .where('did', '=', did)
    .executeTakeFirst()
  if (!res) return null
  return res.takedownRef
    ? { applied: true, ref: res.takedownRef }
    : { applied: false }
}

export const updateAccountTakedownStatus = async (
  db: AccountDb,
  did: string,
  takedown: StatusAttr,
) => {
  const takedownRef = takedown.applied
    ? takedown.ref ?? new Date().toISOString()
    : null
  await db.executeWithRetry(
    db.db.updateTable('actor').set({ takedownRef }).where('did', '=', did),
  )
}

export const deactivateAccount = async (
  db: AccountDb,
  did: string,
  deleteAfter: string | null,
) => {
  await db.executeWithRetry(
    db.db
      .updateTable('actor')
      .set({
        deactivatedAt: new Date().toISOString(),
        deleteAfter,
      })
      .where('did', '=', did),
  )
}

export const activateAccount = async (db: AccountDb, did: string) => {
  await db.executeWithRetry(
    db.db
      .updateTable('actor')
      .set({
        deactivatedAt: null,
        deleteAfter: null,
      })
      .where('did', '=', did),
  )
}
