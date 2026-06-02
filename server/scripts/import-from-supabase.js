#!/usr/bin/env node
/**
 * Import active students, guardians, and classes from Supabase raw tables
 * into local PostgreSQL normalized tables.
 *
 * Also imports meal subscriptions from the forensic analysis.
 *
 * Usage: node server/scripts/import-from-supabase.js
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PG_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/veritus_os'

if (!SB_URL || !SB_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Dynamic import for pg (installed during this script)
let pg
try {
  pg = await import('pg')
} catch {
  console.error('pg not installed. Run: npm install pg')
  process.exit(1)
}

const pool = new pg.default.Pool({ connectionString: PG_URL })

async function sbQuery(table, select = '*', filters = '') {
  const url = `${SB_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filters ? '&' + filters : ''}`
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  })
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function run() {
  console.log('Fetching active students from Supabase checkout view...')
  const activeStudents = await sbQuery('checkout_active_students_view',
    'student_id,full_name,class_name,campus_name,family_name,authorized_guardians')
  console.log(`  Active students: ${activeStudents.length}`)

  console.log('Fetching raw student data for enrichment...')
  const rawAlunos = await sbQuery('sponte_raw_alunos', 'aluno_id,raw_payload')
  const rawByAluno = new Map(rawAlunos.map(r => [r.aluno_id, r.raw_payload]))
  console.log(`  Raw student records: ${rawAlunos.length}`)

  console.log('Fetching guardians...')
  const rawResp = await sbQuery('sponte_raw_responsaveis', 'responsavel_id,raw_payload')
  console.log(`  Raw guardian records: ${rawResp.length}`)

  console.log('Fetching student-guardian links...')
  const rawLinks = await sbQuery('sponte_raw_alunos_responsaveis', 'aluno_id,responsavel_id,raw_payload')
  console.log(`  Links: ${rawLinks.length}`)

  // Build family map from active students
  const familyNames = new Map()
  for (const s of activeStudents) {
    const fname = s.family_name || `Família ${s.full_name.split(' ')[1] || s.full_name}`
    if (!familyNames.has(fname)) familyNames.set(fname, [])
    familyNames.get(fname).push(s)
  }

  console.log(`\nImporting ${familyNames.size} families...`)
  const familyIdMap = new Map()
  for (const [fname, students] of familyNames) {
    const res = await pool.query(
      `INSERT INTO families (family_name, family_code) VALUES ($1, $2)
       ON CONFLICT (family_code) DO UPDATE SET family_name = $1
       RETURNING id`,
      [fname, `FAM-${String(familyIdMap.size + 1).padStart(4, '0')}`]
    )
    familyIdMap.set(fname, res.rows[0].id)
  }

  console.log(`Importing ${activeStudents.length} students...`)
  const studentIdMap = new Map() // sponte_id -> local_id
  for (const s of activeStudents) {
    const raw = rawByAluno.get(s.student_id) || {}
    const fname = s.family_name || `Família ${s.full_name.split(' ')[1] || s.full_name}`
    const familyId = familyIdMap.get(fname)

    // Determine segment from class name
    const cn = (s.class_name || '').toUpperCase()
    let segment = 'fundamental'
    if (['INFANTIL','MATERNAL','BIA','INÊS','CECÍLIA','CLARA','MARGARIDA','ROSA','LÍRIO','GIRASSOL','MIGUEL'].some(k => cn.includes(k))) {
      segment = 'infantil'
    }

    let modality = 'regular'
    if (cn.includes('INTEGRAL')) modality = 'integral'
    if (cn.includes('CONTRATURNO')) modality = 'contraturno'

    let shift = null
    if (cn.includes('MANHÃ') || cn.includes('MANHA')) shift = 'manhã'
    else if (cn.includes('TARDE')) shift = 'tarde'

    const res = await pool.query(
      `INSERT INTO students (family_id, full_name, birth_date, cpf, phone, sex, segment, class_name, shift, modality, allergies, active, source_sponte_id, source_import_batch)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,$13)
       ON CONFLICT DO NOTHING RETURNING id`,
      [
        familyId,
        s.full_name,
        raw.DataNascimento || null,
        raw.CPF || null,
        raw.FoneCelular || raw.FoneResidencial || null,
        raw.Sexo || null,
        segment,
        s.class_name,
        shift,
        modality,
        null, // allergies will come from meal data
        s.student_id,
        'supabase-import',
      ]
    )
    if (res.rows.length) {
      studentIdMap.set(s.student_id, res.rows[0].id)
    }
  }
  console.log(`  Students inserted: ${studentIdMap.size}`)

  // Import guardians
  console.log(`Importing guardians...`)
  const guardianIdMap = new Map() // sponte_id -> local_id
  for (const g of rawResp) {
    const rp = g.raw_payload || {}
    const name = rp.Nome || rp.RazaoSocial || 'Responsável sem nome'
    const res = await pool.query(
      `INSERT INTO guardians (full_name, cpf, email, phone, phone_home, source_sponte_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING RETURNING id`,
      [name, rp.CPF || null, rp.Email || null, rp.FoneCelular || null, rp.FoneResidencial || null, g.responsavel_id]
    )
    if (res.rows.length) guardianIdMap.set(g.responsavel_id, res.rows[0].id)
  }
  console.log(`  Guardians inserted: ${guardianIdMap.size}`)

  // Import links
  console.log(`Importing student-guardian links...`)
  let linkCount = 0
  for (const link of rawLinks) {
    const studentLocalId = studentIdMap.get(link.aluno_id)
    const guardianLocalId = guardianIdMap.get(link.responsavel_id)
    if (!studentLocalId || !guardianLocalId) continue
    const rp = link.raw_payload || {}
    try {
      await pool.query(
        `INSERT INTO student_guardians (student_id, guardian_id, relationship, can_pickup)
         VALUES ($1,$2,$3,true)
         ON CONFLICT (student_id, guardian_id) DO NOTHING`,
        [studentLocalId, guardianLocalId, rp.TipoResponsavel || null]
      )
      linkCount++
    } catch { /* duplicate, skip */ }
  }
  console.log(`  Links inserted: ${linkCount}`)

  // Import meal subscriptions from forensic data
  console.log(`\nImporting meal subscriptions...`)
  const mealData = JSON.parse(readFileSync(join(__dirname, '../../scripts/data/local-checkout-seed.json'), 'utf-8'))

  // Actually, use the matching data from the forensic analysis
  let matchingData
  try {
    matchingData = JSON.parse(readFileSync('/tmp/matching_data.json', 'utf-8'))
  } catch {
    console.log('  WARNING: /tmp/matching_data.json not found. Run forensic analysis first.')
    console.log('  Skipping meal import.')
    matchingData = null
  }

  if (matchingData) {
    // Re-parse the source spreadsheet for meal data
    // We need the actual meal cell data — load from the forensic rows
    let forensicData
    try {
      forensicData = JSON.parse(readFileSync('/tmp/forensic_data.json', 'utf-8'))
    } catch {
      console.log('  WARNING: /tmp/forensic_data.json not found.')
      forensicData = null
    }

    if (forensicData) {
      const DAYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta']
      const matchedNames = new Set(matchingData.matched.filter(m => m.has_meals).map(m => m.name_upper))
      let mealCount = 0

      for (const row of forensicData.rows) {
        if (!matchedNames.has(row.name_upper)) continue
        if (!row.has_meals) continue

        // Find local student ID by name
        const sRes = await pool.query('SELECT id FROM students WHERE upper(full_name) = $1 LIMIT 1', [row.name_upper])
        if (!sRes.rows.length) continue
        const localStudentId = sRes.rows[0].id

        for (let i = 0; i < 5; i++) {
          const dayRaw = row.days[i]
          if (!dayRaw) continue
          const dl = dayRaw.toLowerCase()

          const services = []
          if (/almo[çc]o/.test(dl) && !/contraturno/.test(dl)) services.push('almoco')
          if (/almo[çc]o/.test(dl) && /contraturno/.test(dl)) services.push('almoco_contraturno')
          if (/lanche/.test(dl) && !/manh[ãa]/.test(dl) && !/tarde/.test(dl)) services.push('lanche')
          if (/lanche.*manh[ãa]/.test(dl)) services.push('lanche_manha')
          if (/lanche.*tarde/.test(dl)) services.push('lanche_tarde')
          if (/plant[aã]o/.test(dl) && !/catequese/.test(dl)) services.push('plantao')
          if (/plant[aã]o/.test(dl) && /catequese/.test(dl)) services.push('plantao_catequese')
          if (/jantar/.test(dl)) services.push('jantar')
          if (/integral/.test(dl) && !/manh[ãa]/.test(dl) && !/tarde/.test(dl)) services.push('integral')
          if (/integral.*manh[ãa]/.test(dl)) services.push('integral_manha')
          if (/integral.*tarde/.test(dl)) services.push('integral_tarde')
          if (/catequese.*sem.*almo[çc]o/.test(dl)) services.push('catequese_sem_almoco')

          for (const svc of services) {
            await pool.query(
              `INSERT INTO meal_subscriptions (student_id, weekday, service_type, raw_text, source_file, source_row)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [localStudentId, DAYS[i], svc, dayRaw, '29deMAIO.xls', row.row]
            )
            mealCount++
          }
        }

        // Update student allergies from meal data
        if (row.alergia) {
          await pool.query('UPDATE students SET allergies = $1 WHERE id = $2', [row.alergia, localStudentId])
        }
      }
      console.log(`  Meal subscription rows inserted: ${mealCount}`)
    }
  }

  // Final counts
  const counts = await pool.query(`
    SELECT 'students' AS tbl, count(*) AS n FROM students WHERE active = true
    UNION ALL SELECT 'guardians', count(*) FROM guardians
    UNION ALL SELECT 'student_guardians', count(*) FROM student_guardians
    UNION ALL SELECT 'families', count(*) FROM families
    UNION ALL SELECT 'meal_subscriptions', count(*) FROM meal_subscriptions
    UNION ALL SELECT 'staff_users', count(*) FROM staff_users
    ORDER BY tbl
  `)
  console.log('\n=== IMPORT COMPLETE ===')
  for (const r of counts.rows) {
    console.log(`  ${r.tbl}: ${r.n}`)
  }

  await pool.end()
}

run().catch(err => {
  console.error('Import failed:', err)
  process.exit(1)
})
