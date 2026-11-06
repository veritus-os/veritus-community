#!/usr/bin/env node
/**
 * Gera dados de DEMONSTRAÇÃO de saída de alunos no banco LOCAL de desenvolvimento.
 *
 * Preenche checkout.checkout_logs (e o checkout_daily de hoje) com dias úteis
 * sintéticos para que as telas de métricas e o painel tenham o que mostrar
 * numa máquina de desenvolvimento. NUNCA rode contra produção: o script exige
 * SEED_DEMO=1 e recusa qualquer host que não seja localhost/127.0.0.1.
 *
 *   SEED_DEMO=1 node scripts/dev/seed-checkout-demo.js            # 20 dias úteis
 *   SEED_DEMO=1 DAYS=30 node scripts/dev/seed-checkout-demo.js
 *   SEED_DEMO=1 node scripts/dev/seed-checkout-demo.js --today    # também simula a saída de hoje em andamento
 *   SEED_DEMO=1 node scripts/dev/seed-checkout-demo.js --clear    # apaga só o que este script criou (device_label = 'demo-seed')
 */
import pg from 'pg'

const DB_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/veritus_os'
if (process.env.SEED_DEMO !== '1') { console.error('Recusado: defina SEED_DEMO=1 (só para banco local de desenvolvimento).'); process.exit(1) }
if (!/^postgres(ql)?:\/\/([^@]*@)?(localhost|127\.0\.0\.1)(:|\/)/.test(DB_URL)) { console.error(`Recusado: ${DB_URL.replace(/\/\/.*@/, '//***@')} não é localhost.`); process.exit(1) }

const DAYS = Number(process.env.DAYS) || 20
const DEVICE = 'demo-seed'
const args = new Set(process.argv.slice(2))
const pool = new pg.Pool({ connectionString: DB_URL })

function rnd(a, b) { return a + Math.random() * (b - a) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
// Horário de saída por turno (minutos desde 00:00). Saídas se concentram no fim da aula; cauda = plantão.
function exitWindow(shift) {
  const s = String(shift || '').toLowerCase()
  if (s.includes('manh')) return { start: 11 * 60 + 40, peak: 12 * 60, tail: 12 * 60 + 50 }
  return { start: 17 * 60 + 25, peak: 17 * 60 + 45, tail: 18 * 60 + 40 }
}
function gaussish(min, peak, max) {
  const r = (Math.random() + Math.random() + Math.random()) / 3 // triangular-ish
  return r < 0.5 ? min + (peak - min) * (r / 0.5) : peak + (max - peak) * ((r - 0.5) / 0.5)
}
const STAFF = { reception: ['Recepção'], classroom: ['Coordenação Infantil', 'Coordenação Fundamental'] }

async function main() {
  if (args.has('--clear')) {
    const r1 = await pool.query(`DELETE FROM checkout.checkout_logs WHERE device_label = $1`, [DEVICE])
    const r2 = await pool.query(`DELETE FROM checkout.checkout_daily WHERE device_label = $1`, [DEVICE])
    console.log(`Apagados ${r1.rowCount} logs e ${r2.rowCount} linhas do dia.`)
    return
  }
  const { rows: students } = await pool.query(
    `SELECT student_id, full_name, class_name, campus, shift_name, authorized_guardians FROM checkout.v_board`)
  if (!students.length) { console.error('Sem alunos no v_board.'); return }
  const { rows: [{ today }] } = await pool.query(`SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date::text AS today`)

  // Dias úteis anteriores a hoje.
  const days = []
  const cursor = new Date(`${today}T12:00:00-03:00`)
  while (days.length < DAYS) {
    cursor.setDate(cursor.getDate() - 1)
    const dow = cursor.getDay()
    if (dow === 0 || dow === 6) continue
    days.push(cursor.toISOString().slice(0, 10))
  }

  const client = await pool.connect()
  let logs = 0
  try {
    await client.query('BEGIN')
    for (const day of days) {
      // ~88% dos alunos saem pelo fluxo num dia normal; alguns faltam.
      for (const st of students) {
        if (Math.random() < 0.12) continue
        const w = exitWindow(st.shift_name)
        const calledMin = gaussish(w.start, w.peak, w.tail)
        const releaseDelay = rnd(0.8, 6) + (Math.random() < 0.08 ? rnd(6, 14) : 0)
        const exitDelay = releaseDelay + rnd(0.5, 4)
        const g = Array.isArray(st.authorized_guardians) ? st.authorized_guardians : []
        const guardian = g.length ? pick(g) : null
        const otherPerson = !guardian || Math.random() < 0.04
        const exception = Math.random() < 0.02
        const at = (min) => `${day}T${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}:${String(Math.floor(rnd(0, 59))).padStart(2, '0')}-03:00`
        const coord = st.campus === 'Sede Infantil' ? STAFF.classroom[0] : STAFF.classroom[1]
        const steps = [
          ['at_school', exception ? 'needs_verification' : 'guardian_arrived', at(calledMin), 'Recepção'],
          ...(exception ? [['needs_verification', 'guardian_arrived', at(calledMin + rnd(1, 3)), 'Recepção']] : []),
          ['guardian_arrived', 'released_from_classroom', at(calledMin + releaseDelay), coord],
          ['released_from_classroom', 'left_school', at(calledMin + exitDelay), 'Recepção'],
        ]
        for (const [prev, next, ts, by] of steps) {
          await client.query(
            `INSERT INTO checkout.checkout_logs (student_id, student_name, checkout_date, previous_status, new_status, changed_by_name, changed_by_user_id, campus_name, class_name, device_label, note, pickup_guardian_id, pickup_guardian_name, pickup_person_name, created_at)
             VALUES ($1,$2,$3::date,$4,$5,$6,NULL,$7,$8,$9,$10,$11,$12,$13,$14::timestamptz)`,
            [st.student_id, st.full_name, day, prev, next, by, st.campus, st.class_name, DEVICE,
              exception && next === 'needs_verification' ? 'Pessoa não cadastrada na lista de autorizados.' : null,
              guardian?.guardian_id ?? guardian?.id ?? null, otherPerson ? null : (guardian?.name ?? guardian?.full_name ?? null),
              otherPerson ? pick(['Avó (Dona Lúcia)', 'Tio Marcos', 'Motorista da van', 'Vizinha autorizada por telefone']) : null, ts])
          logs += 1
        }
      }
    }
    if (args.has('--today')) {
      // Saída de hoje em andamento: alguns chamados, alguns liberados, alguns já saíram.
      const sample = [...students].sort(() => Math.random() - 0.5).slice(0, 14)
      let i = 0
      for (const st of sample) {
        const phase = i % 3 // 0 chamado, 1 liberado, 2 saiu
        const now = Date.now()
        const calledAt = new Date(now - rnd(1, 12) * 60000)
        const releasedAt = new Date(calledAt.getTime() + rnd(1, 4) * 60000)
        const leftAt = new Date(releasedAt.getTime() + rnd(1, 3) * 60000)
        const status = phase === 0 ? 'guardian_arrived' : phase === 1 ? 'released_from_classroom' : 'left_school'
        await client.query(
          `INSERT INTO checkout.checkout_daily (student_id, checkout_date, status, campus_name, class_name_snapshot, guardian_arrived_at, guardian_arrived_by_name, released_from_classroom_at, released_from_classroom_by_name, left_school_at, left_school_by_name, device_label, updated_at, updated_by_name)
           VALUES ($1,$2::date,$3,$4,$5,$6,'Recepção',$7,$8,$9,$10,$11,now(),'Recepção')
           ON CONFLICT (student_id, checkout_date) DO UPDATE SET status = EXCLUDED.status, guardian_arrived_at = EXCLUDED.guardian_arrived_at, released_from_classroom_at = EXCLUDED.released_from_classroom_at, left_school_at = EXCLUDED.left_school_at, device_label = EXCLUDED.device_label, updated_at = now()`,
          [st.student_id, today, status, st.campus, st.class_name, calledAt.toISOString(),
            phase >= 1 ? releasedAt.toISOString() : null, phase >= 1 ? 'Coordenação' : null,
            phase === 2 ? leftAt.toISOString() : null, phase === 2 ? 'Recepção' : null, DEVICE])
        i += 1
      }
      console.log(`Hoje: ${sample.length} alunos em andamento (chamados, liberados e saídos).`)
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK'); throw e
  } finally {
    client.release()
  }
  console.log(`Criados ${logs} logs em ${days.length} dias úteis (${days[days.length - 1]} a ${days[0]}).`)
}

main().then(() => pool.end()).catch((e) => { console.error(e); pool.end(); process.exit(1) })
