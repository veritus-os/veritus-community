#!/usr/bin/env node
/**
 * VeritusOS — Server health check
 * Verifies database, API, and data integrity.
 * Usage: node server/scripts/server-health.js
 */

import pg from 'pg'

const DB_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/veritus_os'
const API_URL = process.env.API_URL || 'http://localhost:3001'

async function check(label, fn) {
  try {
    const result = await fn()
    console.log(`  [OK] ${label}: ${result}`)
    return true
  } catch (err) {
    console.log(`  [FAIL] ${label}: ${err.message}`)
    return false
  }
}

async function run() {
  console.log('VeritusOS — Health Check\n')
  let ok = 0
  let fail = 0

  // Database
  console.log('Database:')
  const pool = new pg.Pool({ connectionString: DB_URL })

  if (await check('PostgreSQL connection', async () => {
    await pool.query('SELECT 1')
    return 'connected'
  })) ok++; else fail++

  if (await check('Active students', async () => {
    const { rows } = await pool.query('SELECT count(*) AS n FROM students WHERE active = true')
    const n = Number(rows[0].n)
    if (n < 100) throw new Error(`only ${n} — expected ~385`)
    return n
  })) ok++; else fail++

  if (await check('Guardians', async () => {
    const { rows } = await pool.query('SELECT count(*) AS n FROM guardians')
    return Number(rows[0].n)
  })) ok++; else fail++

  if (await check('Meal subscriptions', async () => {
    const { rows } = await pool.query('SELECT count(*) AS n FROM meal_subscriptions')
    return Number(rows[0].n)
  })) ok++; else fail++

  if (await check('Staff users', async () => {
    const { rows } = await pool.query('SELECT count(*) AS n FROM staff_users WHERE active = true')
    const n = Number(rows[0].n)
    if (n < 1) throw new Error('no active users')
    return n
  })) ok++; else fail++

  // API
  console.log('\nAPI:')
  if (await check(`API server (${API_URL})`, async () => {
    const res = await fetch(`${API_URL}/api/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return `status=${data.status}, students=${data.students}`
  })) ok++; else fail++

  // Summary
  console.log(`\n${'='.repeat(40)}`)
  console.log(`  Checks: ${ok + fail} total, ${ok} passed, ${fail} failed`)
  if (fail === 0) {
    console.log('  Status: ALL OK')
  } else {
    console.log('  Status: ISSUES FOUND — see above')
  }

  await pool.end()
  process.exit(fail > 0 ? 1 : 0)
}

run().catch(err => { console.error('Health check failed:', err.message); process.exit(1) })
