#!/usr/bin/env node
/**
 * READ-ONLY diagnostic: test whether a candidate password matches any staff
 * account, WITHOUT revealing the password or any stored hash.
 *
 * Use it to check exposure — e.g. is any account still using a password that
 * leaked into the repo? It only SELECTs and bcrypt-compares in memory; it never
 * writes, and prints only MATCH / no per account.
 *
 * Usage: node server/scripts/check-password.js
 *   (the candidate password is asked with hidden input)
 * Exit code: 2 if at least one account matches, 0 if none (handy for scripting).
 */
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { promptHidden } from './_prompt.js'

const DB_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/veritus_os'

const candidate = await promptHidden('Senha candidata (oculta): ')
if (!candidate) { console.error('Nenhuma senha informada.'); process.exit(1) }

const pool = new pg.Pool({ connectionString: DB_URL })
const { rows } = await pool.query('SELECT email, role, password_hash FROM staff_users ORDER BY email')

let matches = 0
for (const u of rows) {
  const hit = Boolean(u.password_hash) && bcrypt.compareSync(candidate, u.password_hash)
  if (hit) matches++
  console.log(`${hit ? 'MATCH ' : 'no    '} ${u.email}  (${u.role})`)
}
console.log(`\n${matches} de ${rows.length} conta(s) usam essa senha.`)
await pool.end()
process.exit(matches > 0 ? 2 : 0)
