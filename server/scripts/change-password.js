#!/usr/bin/env node
/**
 * Change a staff user's password.
 * Usage: node server/scripts/change-password.js <email> <new-password>
 */

import pg from 'pg'
import bcrypt from 'bcryptjs'

const DB_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/veritus_os'
const [,, email, newPassword] = process.argv

if (!email || !newPassword) {
  console.error('Usage: node server/scripts/change-password.js <email> <new-password>')
  console.error('Example: node server/scripts/change-password.js patricia@cav.local NovaSenha@2026')
  process.exit(1)
}

if (newPassword.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: DB_URL })

const hash = bcrypt.hashSync(newPassword, 10)
const { rows } = await pool.query(
  'UPDATE staff_users SET password_hash = $1, updated_at = now() WHERE email = $2 RETURNING id, full_name, email, role',
  [hash, email.toLowerCase()]
)

if (!rows.length) {
  console.error(`User "${email}" not found.`)
  process.exit(1)
}

console.log(`Password changed for: ${rows[0].full_name} (${rows[0].email}) role=${rows[0].role}`)
await pool.end()
