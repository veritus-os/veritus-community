#!/usr/bin/env node
/**
 * Change a staff user's password — interactive, with HIDDEN input.
 *
 * Usage:
 *   node server/scripts/change-password.js [email]
 *     - email is prompted if omitted
 *     - the new password is ALWAYS typed with hidden input (twice, to confirm);
 *       it is never read from the command line, so it can't leak into shell
 *       history or the process argument list.
 *
 * Back-compat (discouraged): `node change-password.js <email> <password>` still
 * works but prints a warning, because a password in argv is exposed.
 */
import pg from 'pg'
import bcrypt from 'bcryptjs'
import readline from 'node:readline'
import { promptHidden } from './_prompt.js'

const DB_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/veritus_os'

function askVisible(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(query, (answer) => { rl.close(); resolve(answer.trim()) }))
}

const argEmail = process.argv[2]
const argPassword = process.argv[3]

const email = (argEmail || await askVisible('E-mail: ')).toLowerCase().trim()
if (!email) { console.error('E-mail obrigatório. Nada foi alterado.'); process.exit(1) }

let newPassword
if (argPassword) {
  console.warn('AVISO: senha informada por argumento fica exposta no histórico do shell e na lista de processos.')
  console.warn('       Prefira rodar sem a senha para digitá-la de forma oculta.')
  newPassword = argPassword
} else {
  newPassword = await promptHidden('Nova senha (oculta): ')
  const confirm = await promptHidden('Confirme a senha:    ')
  if (newPassword !== confirm) { console.error('As senhas não coincidem. Nada foi alterado.'); process.exit(1) }
}

if (!newPassword || newPassword.length < 8) {
  console.error('A senha deve ter ao menos 8 caracteres. Nada foi alterado.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: DB_URL })
const hash = bcrypt.hashSync(newPassword, 10)
const { rows } = await pool.query(
  'UPDATE staff_users SET password_hash = $1, updated_at = now() WHERE lower(email) = $2 RETURNING id, full_name, email, role',
  [hash, email]
)

if (!rows.length) {
  console.error(`Usuário "${email}" não encontrado. Nada foi alterado.`)
  await pool.end()
  process.exit(1)
}

console.log(`Senha alterada: ${rows[0].full_name} (${rows[0].email}) role=${rows[0].role}`)
await pool.end()
