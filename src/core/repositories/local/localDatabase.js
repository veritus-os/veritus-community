import { defaultChartOfAccounts } from '../../data/defaultChartOfAccounts'

const STORAGE_KEY = 'cav_os_school_data_v6'

/* One-time migration: wipe old versions + stale notices so fresh seed loads */
if (typeof window !== 'undefined') {
  const migrated = window.localStorage.getItem('cav_os_migrated_v6')
  if (!migrated) {
    window.localStorage.removeItem('cav_os_school_data_v5')
    window.localStorage.removeItem('cav_os_school_data_v4')
    window.localStorage.removeItem('cav_os_school_data_v3')
    window.localStorage.removeItem('cav_os_school_data_v2')
    window.localStorage.removeItem('cav_os_school_data_v1')
    window.localStorage.removeItem('cav_os_notices_v1')
    window.localStorage.removeItem('cav_os_notices_v2')
    window.localStorage.removeItem('cav_os_migrated_v5')
    window.localStorage.removeItem('cav_os_migrated_v4')
    window.localStorage.removeItem('cav_os_migrated_v3')
    window.localStorage.setItem('cav_os_migrated_v6', '1')
  }
}

const nowIso = () => new Date().toISOString()

function createSeed() {
  const createdAt = nowIso()

  /* ── helper to build a student quickly ── */
  const s = (id, fam, name, birth, seg, cls, shift, mod, opts = {}) => ({
    id, family_id: fam, full_name: name, cpf: '', birth_date: birth,
    segment: seg, class_name: cls, shift, modality: mod,
    allergies: opts.allergies || '', dietary_restrictions: opts.dietary || '',
    authorized_pickup_notes: opts.pickup || '', active_status: opts.active ?? true,
    ano_entrada: opts.entry || 2024, ano_atual_matricula: 2026,
    has_scholarship: opts.scholarship ?? false, scholarship_type: opts.stype || '',
    scholarship_notes: opts.snotes || '', notes: opts.notes || '',
    extracurricular_activities: opts.extra || [], extracurricular_other: opts.extraOther || '',
    jantar_contratado: opts.jantar ?? false, plantao_ativo: opts.plantao ?? false,
    created_at: createdAt, updated_at: createdAt,
  })

  /* ── helper to build a financial record quickly ── */
  let finId = 0
  const fin = (fam, stu, resp, type, amount, month, status, method, opts = {}) => {
    finId++
    return {
      id: finId, family_id: fam, student_id: stu, responsible_id: resp,
      item_type: type, item_subtype: opts.sub || null, amount,
      due_date: `${month}-10`, payment_method: method,
      payment_status: status, reference_month: month,
      payment_date: status === 'paid' ? `${month}-08` : null,
      installment_number: opts.inst || 1, installment_total: opts.instTotal || 1,
      scholarship_type: opts.stype || '', scholarship_tag: opts.stag || '',
      cash_flow_type: opts.flow || 'entrada', notes: opts.notes || '',
      created_at: createdAt, updated_at: createdAt, updated_by: 'sistema',
    }
  }

  return {
    counters: {
      families: 12,
      responsibles: 14,
      students: 32,
      employees: 10,
      meal_contracts: 65,
      events: 9,
      event_orders: 15,
      student_tags: 12,
      class_reports: 2,
      pedagogical_plans: 2,
      attendance_records: 5,
      tag_registry: 8,
      financial_records: 100,
      audit_logs: 3,
      activity_tags: 0,
      student_activity_tags: 0,
      student_checkout_daily: 0,
      student_checkout_logs: 0,
      asset_catalog: 10,
      library_books: 10,
      categories: defaultChartOfAccounts.length,
      contracts: 0,
      bank_statements: 0,
      recurring_templates: 0,
    },
    families: [
      { id: 1, family_code: 'FAM-0001', family_name: 'Família Souza', address: 'Rua das Acácias', number: '120', complement: 'Apto 31', zip_code: '04567-000', city: 'São Paulo', neighborhood: 'Moema', notes: 'Contato preferencial no período da manhã.', has_scholarship: true, scholarship_notes: 'Bolsa parcial por segundo filho.', created_at: createdAt, updated_at: createdAt },
      { id: 2, family_code: 'FAM-0002', family_name: 'Família Lima', address: 'Av. Brasil', number: '890', complement: '', zip_code: '30123-111', city: 'Belo Horizonte', neighborhood: 'Savassi', notes: '', has_scholarship: false, scholarship_notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 3, family_code: 'FAM-0003', family_name: 'Família Almeida', address: 'Rua das Flores', number: '45', complement: 'Casa', zip_code: '80011-220', city: 'Curitiba', neighborhood: 'Batel', notes: 'Alergia alimentar em um dos alunos.', has_scholarship: true, scholarship_notes: 'Bolsa via secretaria de educação.', created_at: createdAt, updated_at: createdAt },
      { id: 4, family_code: 'FAM-0004', family_name: 'Família Ferreira', address: 'Rua São João', number: '310', complement: '', zip_code: '01035-000', city: 'São Paulo', neighborhood: 'Centro', notes: '', has_scholarship: false, scholarship_notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 5, family_code: 'FAM-0005', family_name: 'Família Oliveira', address: 'Rua Parana', number: '55', complement: 'Bl B Apto 12', zip_code: '80060-000', city: 'São Paulo', neighborhood: 'Vila Mariana', notes: 'Dois filhos no integral.', has_scholarship: true, scholarship_notes: 'Bolsa terceiro filho.', created_at: createdAt, updated_at: createdAt },
      { id: 6, family_code: 'FAM-0006', family_name: 'Família Santos', address: 'Av. Paulista', number: '1578', complement: 'Cj 42', zip_code: '01310-200', city: 'São Paulo', neighborhood: 'Bela Vista', notes: '', has_scholarship: false, scholarship_notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 7, family_code: 'FAM-0007', family_name: 'Família Costa', address: 'Rua Augusta', number: '420', complement: '', zip_code: '01304-001', city: 'São Paulo', neighborhood: 'Consolação', notes: '', has_scholarship: false, scholarship_notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 8, family_code: 'FAM-0008', family_name: 'Família Pereira', address: 'Rua XV de Novembro', number: '78', complement: 'Casa', zip_code: '80020-310', city: 'São Paulo', neighborhood: 'Pinheiros', notes: 'Mãe é professora na rede pública.', has_scholarship: true, scholarship_notes: 'SINPRO.', created_at: createdAt, updated_at: createdAt },
      { id: 9, family_code: 'FAM-0009', family_name: 'Família Rodrigues', address: 'Rua Voluntários da Pátria', number: '200', complement: 'Apto 5', zip_code: '02011-000', city: 'São Paulo', neighborhood: 'Santana', notes: '', has_scholarship: false, scholarship_notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 10, family_code: 'FAM-0010', family_name: 'Família Martins', address: 'Rua dos Pinheiros', number: '645', complement: '', zip_code: '05422-012', city: 'São Paulo', neighborhood: 'Pinheiros', notes: '', has_scholarship: false, scholarship_notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 11, family_code: 'FAM-0011', family_name: 'Família Barbosa', address: 'Av. Angélica', number: '1200', complement: 'Apto 81', zip_code: '01228-000', city: 'São Paulo', neighborhood: 'Higienópolis', notes: '', has_scholarship: true, scholarship_notes: 'Bolsa segundo filho.', created_at: createdAt, updated_at: createdAt },
      { id: 12, family_code: 'FAM-0012', family_name: 'Família Nascimento', address: 'Rua Oscar Freire', number: '390', complement: '', zip_code: '01426-001', city: 'São Paulo', neighborhood: 'Jardins', notes: 'Pagamento via empresa.', has_scholarship: false, scholarship_notes: '', created_at: createdAt, updated_at: createdAt },
    ],
    responsibles: [
      { id: 1, family_id: 1, full_name: 'Fernanda Souza', cpf: '12345678909', email: 'fernanda.souza@email.com', phone: '+55 11 99811-2201', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 2, family_id: 2, full_name: 'Gustavo Lima', cpf: '98765432100', email: 'gustavo.lima@email.com', phone: '+55 21 99733-1101', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 3, family_id: 3, full_name: 'Patricia Almeida', cpf: '11144477735', email: 'patricia.almeida@email.com', phone: '+55 41 99512-3301', is_financial_responsible: true, pickup_authorized: true, notes: 'Autoriza retirada pela avó em dias úteis.', created_at: createdAt, updated_at: createdAt },
      { id: 4, family_id: 4, full_name: 'Roberto Ferreira', cpf: '22233344456', email: 'roberto.ferreira@email.com', phone: '+55 11 99777-4401', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 5, family_id: 5, full_name: 'Camila Oliveira', cpf: '33344455567', email: 'camila.oliveira@email.com', phone: '+55 11 99666-5501', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 6, family_id: 6, full_name: 'André Santos', cpf: '44455566678', email: 'andre.santos@email.com', phone: '+55 11 99555-6601', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 7, family_id: 7, full_name: 'Juliana Costa', cpf: '55566677789', email: 'juliana.costa@email.com', phone: '+55 11 99444-7701', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 8, family_id: 8, full_name: 'Marcelo Pereira', cpf: '66677788890', email: 'marcelo.pereira@email.com', phone: '+55 11 99333-8801', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 9, family_id: 9, full_name: 'Renata Rodrigues', cpf: '77788899901', email: 'renata.rodrigues@email.com', phone: '+55 11 99222-9901', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 10, family_id: 10, full_name: 'Felipe Martins', cpf: '88899900012', email: 'felipe.martins@email.com', phone: '+55 11 99111-1001', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 11, family_id: 11, full_name: 'Tatiana Barbosa', cpf: '99900011123', email: 'tatiana.barbosa@email.com', phone: '+55 11 99000-1101', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 12, family_id: 12, full_name: 'Diego Nascimento', cpf: '10011122234', email: 'diego.nascimento@email.com', phone: '+55 11 98899-1201', is_financial_responsible: true, pickup_authorized: true, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 13, family_id: 1, full_name: 'Ricardo Souza', cpf: '12345678910', email: 'ricardo.souza@email.com', phone: '+55 11 99811-2202', is_financial_responsible: false, pickup_authorized: true, notes: 'Pai', created_at: createdAt, updated_at: createdAt },
      { id: 14, family_id: 4, full_name: 'Luciana Ferreira', cpf: '22233344457', email: 'luciana.ferreira@email.com', phone: '+55 11 99777-4402', is_financial_responsible: false, pickup_authorized: true, notes: 'Mãe', created_at: createdAt, updated_at: createdAt },
    ],
    students: [
      /* ─── Família 1 – Souza ─── */
      s(1, 1, 'Beatriz Souza', '2014-04-12', 'fundamental', '7A', 'manhã', 'turno', { entry: 2023, pickup: 'Somente mãe e pai.' }),
      s(2, 1, 'Matheus Souza', '2017-09-02', 'infantil', 'Infantil 5', 'tarde', 'integral', { entry: 2024, allergies: 'Lactose', dietary: 'Evitar leite integral.', scholarship: true, stype: 'bolsa_segundo_filho', snotes: 'Desconto familiar.' }),
      /* ─── Família 2 – Lima ─── */
      s(3, 2, 'Lucas Lima', '2015-07-04', 'fundamental', '6A', 'manhã', 'turno', { entry: 2022, notes: 'Acompanhamento pedagógico de matemática.', extra: ['futebol'] }),
      s(4, 2, 'Valentina Lima', '2019-03-18', 'infantil', 'Infantil 4', 'tarde', 'turno', { entry: 2025, pickup: 'Pode sair com tia Ana.', extraOther: 'Teatro municipal' }),
      /* ─── Família 3 – Almeida ─── */
      s(5, 3, 'Sofia Almeida', '2012-11-25', 'fundamental', '9A', 'manhã', 'contraturno', { entry: 2021, allergies: 'Amendoim', dietary: 'Sem traços de amendoim.', scholarship: true, stype: 'bolsa_secretaria_educacao', snotes: 'Bolsa integral de convênio.', extra: ['catequese'], plantao: true }),
      /* ─── Família 4 – Ferreira ─── */
      s(6, 4, 'Gabriel Ferreira', '2013-01-15', 'fundamental', '8A', 'manhã', 'turno', { entry: 2022 }),
      s(7, 4, 'Isabela Ferreira', '2016-06-20', 'fundamental', '6A', 'manhã', 'turno', { entry: 2024, extra: ['ballet'] }),
      s(8, 4, 'Pedro Ferreira', '2019-11-03', 'infantil', 'Infantil 4', 'tarde', 'integral', { entry: 2025 }),
      /* ─── Família 5 – Oliveira ─── */
      s(9, 5, 'Ana Clara Oliveira', '2014-08-22', 'fundamental', '7A', 'manhã', 'turno', { entry: 2023, extra: ['vôlei'] }),
      s(10, 5, 'Davi Oliveira', '2016-12-10', 'fundamental', '6A', 'manhã', 'integral', { entry: 2024 }),
      s(11, 5, 'Helena Oliveira', '2020-02-14', 'infantil', 'Infantil 3', 'tarde', 'turno', { entry: 2026, scholarship: true, stype: 'bolsa_terceiro_filho', snotes: 'Desconto terceiro filho.' }),
      /* ─── Família 6 – Santos ─── */
      s(12, 6, 'Miguel Santos', '2013-05-30', 'fundamental', '8A', 'manhã', 'turno', { entry: 2021, extra: ['futebol', 'natação'] }),
      s(13, 6, 'Laura Santos', '2015-09-18', 'fundamental', '7A', 'manhã', 'turno', { entry: 2023 }),
      /* ─── Família 7 – Costa ─── */
      s(14, 7, 'Rafael Costa', '2012-03-07', 'fundamental', '9A', 'manhã', 'contraturno', { entry: 2020, plantao: true }),
      s(15, 7, 'Manuela Costa', '2017-07-25', 'infantil', 'Infantil 5', 'tarde', 'turno', { entry: 2025 }),
      /* ─── Família 8 – Pereira ─── */
      s(16, 8, 'Arthur Pereira', '2014-10-12', 'fundamental', '7A', 'manhã', 'turno', { entry: 2022, scholarship: true, stype: 'SINPRO', snotes: 'Convênio sindical.' }),
      s(17, 8, 'Clara Pereira', '2018-01-28', 'infantil', 'Infantil 5', 'tarde', 'integral', { entry: 2025 }),
      /* ─── Família 9 – Rodrigues ─── */
      s(18, 9, 'Enzo Rodrigues', '2013-09-05', 'fundamental', '8A', 'manhã', 'turno', { entry: 2021, extra: ['judô'] }),
      s(19, 9, 'Lara Rodrigues', '2016-04-16', 'fundamental', '6A', 'manhã', 'turno', { entry: 2024 }),
      /* ─── Família 10 – Martins ─── */
      s(20, 10, 'Theo Martins', '2015-02-20', 'fundamental', '6A', 'manhã', 'turno', { entry: 2023 }),
      s(21, 10, 'Alice Martins', '2018-08-11', 'infantil', 'Infantil 4', 'tarde', 'turno', { entry: 2025 }),
      /* ─── Família 11 – Barbosa ─── */
      s(22, 11, 'Nicolas Barbosa', '2013-12-01', 'fundamental', '8A', 'manhã', 'turno', { entry: 2022 }),
      s(23, 11, 'Maria Eduarda Barbosa', '2016-03-14', 'fundamental', '7A', 'manhã', 'turno', { entry: 2024, scholarship: true, stype: 'bolsa_segundo_filho', snotes: 'Desconto segundo filho.' }),
      /* ─── Família 12 – Nascimento ─── */
      s(24, 12, 'Bernardo Nascimento', '2014-06-08', 'fundamental', '7A', 'manhã', 'turno', { entry: 2023 }),
      s(25, 12, 'Cecília Nascimento', '2017-10-30', 'infantil', 'Infantil 5', 'tarde', 'integral', { entry: 2025 }),
      /* ─── Extra students to fill classes ─── */
      s(26, 6, 'Heitor Santos', '2018-04-22', 'infantil', 'Infantil 4', 'tarde', 'turno', { entry: 2026 }),
      s(27, 7, 'Lívia Costa', '2020-01-10', 'infantil', 'Infantil 3', 'tarde', 'turno', { entry: 2026 }),
      s(28, 9, 'Caio Rodrigues', '2019-06-18', 'infantil', 'Infantil 3', 'tarde', 'integral', { entry: 2026 }),
      s(29, 10, 'Isadora Martins', '2013-07-22', 'fundamental', '8A', 'manhã', 'turno', { entry: 2021 }),
      s(30, 11, 'Otávio Barbosa', '2019-09-05', 'infantil', 'Infantil 4', 'tarde', 'turno', { entry: 2026 }),
      /* 1 inactive student for "saídas" metric */
      s(31, 4, 'Thiago Ferreira', '2014-02-28', 'fundamental', '7A', 'manhã', 'turno', { entry: 2022, active: false, notes: 'Transferido em março/2026.' }),
      s(32, 9, 'Marina Rodrigues', '2015-11-12', 'fundamental', '6A', 'manhã', 'turno', { entry: 2023, active: false, notes: 'Mudou de cidade.' }),
    ],
    employees: [
      { id: 1, full_name: 'Mariana Costa', email: 'mariana.costa@altavista.edu.br', phone: '+55 11 98888-1001', cargo: 'Coordenadora Pedagógica', access_type: 'administrador', role: 'administrador', active_status: true, last_login_at: createdAt, last_access_at: createdAt, notes: 'Coordena projetos de ciências.', created_at: createdAt, updated_at: createdAt },
      { id: 2, full_name: 'Paula Ribeiro', email: 'paula.ribeiro@altavista.edu.br', phone: '+55 11 98888-1002', cargo: 'Secretária', access_type: 'secretaria', role: 'secretaria', active_status: true, last_login_at: createdAt, last_access_at: createdAt, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 3, full_name: 'Carlos Teixeira', email: 'carlos.teixeira@altavista.edu.br', phone: '+55 11 98888-1003', cargo: 'Cozinheiro', access_type: 'cozinha', role: 'cozinha', active_status: true, last_login_at: createdAt, last_access_at: createdAt, notes: 'Responsável por planejamento de insumos.', created_at: createdAt, updated_at: createdAt },
      { id: 4, full_name: 'Bianca Mello', email: 'bianca.mello@altavista.edu.br', phone: '+55 11 98888-1004', cargo: 'Analista Financeiro', access_type: 'financeiro', role: 'financeiro', active_status: true, last_login_at: createdAt, last_access_at: createdAt, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 5, full_name: 'Rodrigo Leal', email: 'rodrigo.leal@altavista.edu.br', phone: '+55 11 98888-1005', cargo: 'Professor de Matemática', access_type: 'professor', role: 'professor', active_status: true, last_login_at: createdAt, last_access_at: createdAt, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 6, full_name: 'Aline Prado', email: 'aline.prado@altavista.edu.br', phone: '+55 11 98888-1006', cargo: 'Auxiliar Administrativo', access_type: 'administrador', role: 'administrador', active_status: false, last_login_at: createdAt, last_access_at: null, notes: 'Acesso desativado temporariamente.', created_at: createdAt, updated_at: createdAt },
      { id: 7, full_name: 'Fernanda Dias', email: 'fernanda.dias@altavista.edu.br', phone: '+55 11 98888-1007', cargo: 'Professora de Português', access_type: 'professor', role: 'professor', active_status: true, last_login_at: createdAt, last_access_at: createdAt, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 8, full_name: 'Lucas Andrade', email: 'lucas.andrade@altavista.edu.br', phone: '+55 11 98888-1008', cargo: 'Professor de Educação Física', access_type: 'professor', role: 'professor', active_status: true, last_login_at: createdAt, last_access_at: createdAt, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 9, full_name: 'Sandra Nunes', email: 'sandra.nunes@altavista.edu.br', phone: '+55 11 98888-1009', cargo: 'Professora Infantil', access_type: 'professor', role: 'professor', active_status: true, last_login_at: createdAt, last_access_at: createdAt, notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 10, full_name: 'Jorge Campos', email: 'jorge.campos@altavista.edu.br', phone: '+55 11 98888-1010', cargo: 'Porteiro', access_type: 'secretaria', role: 'secretaria', active_status: true, last_login_at: createdAt, last_access_at: createdAt, notes: '', created_at: createdAt, updated_at: createdAt },
    ],
    meal_contracts: (() => {
      let mcId = 0
      const mc = (stuId, famId, meal, contract, weekday, seg, mod, shift, opts = {}) => {
        mcId++
        return {
          id: mcId, student_id: stuId, family_id: famId, service_type: 'meal',
          meal_type: meal, contract_type: contract, weekday: contract === 'daily' ? null : weekday,
          date: contract === 'daily' ? (opts.date || '2026-04-28') : null,
          active_status: opts.active ?? true, notes: opts.notes || '',
          segment: seg, modality: mod, shift,
          created_at: createdAt, updated_at: createdAt,
        }
      }
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      const contracts = []

      /* Monthly lunch contracts — 15 students (most popular) */
      const monthlyLunch = [
        [1,1,'fundamental','turno','manhã'], [3,2,'fundamental','turno','manhã'],
        [5,3,'fundamental','contraturno','manhã'], [6,4,'fundamental','turno','manhã'],
        [9,5,'fundamental','turno','manhã'], [10,5,'fundamental','integral','manhã'],
        [12,6,'fundamental','turno','manhã'], [14,7,'fundamental','contraturno','manhã'],
        [16,8,'fundamental','turno','manhã'], [18,9,'fundamental','turno','manhã'],
        [20,10,'fundamental','turno','manhã'], [22,11,'fundamental','turno','manhã'],
        [24,12,'fundamental','turno','manhã'], [13,6,'fundamental','turno','manhã'],
        [29,10,'fundamental','turno','manhã'],
      ]
      monthlyLunch.forEach(([stu,fam,seg,mod,sh]) => {
        contracts.push(mc(stu, fam, 'lunch', 'monthly', null, seg, mod, sh))
      })

      /* Monthly morning_snack — 10 students (infantil + integral) */
      const monthlyMorning = [
        [2,1,'infantil','integral','tarde'], [4,2,'infantil','turno','tarde'],
        [8,4,'infantil','integral','tarde'], [11,5,'infantil','turno','tarde'],
        [15,7,'infantil','turno','tarde'], [17,8,'infantil','integral','tarde'],
        [21,10,'infantil','turno','tarde'], [25,12,'infantil','integral','tarde'],
        [27,7,'infantil','turno','tarde'], [28,9,'infantil','integral','tarde'],
      ]
      monthlyMorning.forEach(([stu,fam,seg,mod,sh]) => {
        contracts.push(mc(stu, fam, 'morning_snack', 'monthly', null, seg, mod, sh))
      })

      /* Monthly afternoon_snack — 12 students */
      const monthlyAfternoon = [
        [2,1,'infantil','integral','tarde'], [5,3,'fundamental','contraturno','manhã'],
        [8,4,'infantil','integral','tarde'], [10,5,'fundamental','integral','manhã'],
        [14,7,'fundamental','contraturno','manhã'], [17,8,'infantil','integral','tarde'],
        [25,12,'infantil','integral','tarde'], [26,6,'infantil','turno','tarde'],
        [27,7,'infantil','turno','tarde'], [28,9,'infantil','integral','tarde'],
        [30,11,'infantil','turno','tarde'], [11,5,'infantil','turno','tarde'],
      ]
      monthlyAfternoon.forEach(([stu,fam,seg,mod,sh]) => {
        contracts.push(mc(stu, fam, 'afternoon_snack', 'monthly', null, seg, mod, sh))
      })

      /* Weekly contracts — specific days */
      const weeklyContracts = [
        [1,1,'afternoon_snack','wednesday','fundamental','turno','manhã'],
        [3,2,'afternoon_snack','thursday','fundamental','turno','manhã'],
        [6,4,'morning_snack','monday','fundamental','turno','manhã'],
        [7,4,'lunch','tuesday','fundamental','turno','manhã'],
        [9,5,'afternoon_snack','friday','fundamental','turno','manhã'],
        [12,6,'afternoon_snack','monday','fundamental','turno','manhã'],
        [13,6,'lunch','wednesday','fundamental','turno','manhã'],
        [16,8,'morning_snack','thursday','fundamental','turno','manhã'],
        [18,9,'afternoon_snack','tuesday','fundamental','turno','manhã'],
        [19,9,'lunch','friday','fundamental','turno','manhã'],
        [20,10,'morning_snack','wednesday','fundamental','turno','manhã'],
        [22,11,'afternoon_snack','thursday','fundamental','turno','manhã'],
        [23,11,'lunch','monday','fundamental','turno','manhã'],
        [24,12,'morning_snack','friday','fundamental','turno','manhã'],
      ]
      weeklyContracts.forEach(([stu,fam,meal,day,seg,mod,sh]) => {
        contracts.push(mc(stu, fam, meal, 'weekly', day, seg, mod, sh))
      })

      /* Daily contracts — one-off meals this week */
      const dailyContracts = [
        [7,4,'lunch','2026-04-28','fundamental','turno','manhã'],
        [19,9,'morning_snack','2026-04-29','fundamental','turno','manhã'],
        [23,11,'afternoon_snack','2026-04-30','fundamental','turno','manhã'],
        [29,10,'morning_snack','2026-04-28','fundamental','turno','manhã'],
        [30,11,'lunch','2026-05-02','infantil','turno','tarde'],
        [4,2,'lunch','2026-04-28','infantil','turno','tarde'],
      ]
      dailyContracts.forEach(([stu,fam,meal,date,seg,mod,sh]) => {
        contracts.push(mc(stu, fam, meal, 'daily', null, seg, mod, sh, { date }))
      })

      return contracts
    })(),
    events: [
      { id: 1, title: 'Festa da Família', kind: 'evento', description: 'Evento anual com apresentações e integração de pais e alunos.', event_date: '2026-05-18', active_status: true, is_archived: false, payment_link: 'https://pagamentos.altavista.edu.br/festa-familia', support_link: 'https://wa.me/5511999999999', group_link: 'https://chat.whatsapp.com/festa-familia-2026', notes: 'Local: quadra coberta', created_at: createdAt, updated_at: createdAt },
      { id: 2, title: 'Camiseta Esportiva 2026', kind: 'servico', description: 'Camisetas oficiais para os jogos internos.', event_date: '2026-06-02', active_status: true, is_archived: false, payment_link: 'https://pagamentos.altavista.edu.br/camisas-jogos', support_link: 'https://wa.me/5511999999999', group_link: 'https://chat.whatsapp.com/jogos-internos', notes: 'Tamanhos: PP ao GG', created_at: createdAt, updated_at: createdAt },
      { id: 3, title: 'Judô', kind: 'servico', description: 'Aulas de judô — turma infantil e fundamental.', event_date: '2026-03-01', active_status: true, is_archived: false, payment_link: 'https://pagamentos.altavista.edu.br/judo', support_link: 'https://wa.me/5511988881111', group_link: 'https://chat.whatsapp.com/judo-cav', notes: 'Terça e quinta, 15h às 16h', created_at: createdAt, updated_at: createdAt },
      { id: 4, title: 'Ballet', kind: 'servico', description: 'Aulas de ballet clássico para infantil e fundamental I.', event_date: '2026-03-01', active_status: true, is_archived: false, payment_link: 'https://pagamentos.altavista.edu.br/ballet', support_link: 'https://wa.me/5511988882222', group_link: 'https://chat.whatsapp.com/ballet-cav', notes: 'Segunda e quarta, 14h às 15h', created_at: createdAt, updated_at: createdAt },
      { id: 5, title: 'Catequese', kind: 'servico', description: 'Preparação para primeira comunhão.', event_date: '2026-03-01', active_status: true, is_archived: false, payment_link: 'https://pagamentos.altavista.edu.br/catequese', support_link: 'https://wa.me/5511988883333', group_link: 'https://chat.whatsapp.com/catequese-cav', notes: 'Sábados, 9h às 10h30', created_at: createdAt, updated_at: createdAt },
      { id: 6, title: 'Futebol', kind: 'servico', description: 'Escolinha de futebol — quadra coberta.', event_date: '2026-03-01', active_status: true, is_archived: false, payment_link: 'https://pagamentos.altavista.edu.br/futebol', support_link: 'https://wa.me/5511988884444', group_link: 'https://chat.whatsapp.com/futebol-cav', notes: 'Quarta e sexta, 16h às 17h', created_at: createdAt, updated_at: createdAt },
      { id: 7, title: 'Alimentação Especial', kind: 'servico', description: 'Plano de refeição personalizado para alunos com restrições.', event_date: '2026-03-01', active_status: true, is_archived: false, payment_link: 'https://pagamentos.altavista.edu.br/alimentacao-especial', support_link: 'https://wa.me/5511988885555', group_link: '', notes: 'Cardápio elaborado pela nutricionista', created_at: createdAt, updated_at: createdAt },
      { id: 8, title: 'Passeio Cultural 2025', kind: 'evento', description: 'Evento encerrado para histórico institucional.', event_date: '2025-11-12', active_status: false, is_archived: true, payment_link: '', support_link: 'https://wa.me/5511999999999', group_link: '', notes: 'Arquivado após conclusão.', created_at: createdAt, updated_at: createdAt },
      { id: 9, title: 'Festa Junina 2025', kind: 'evento', description: 'Festa junina com barracas e apresentações.', event_date: '2025-06-21', active_status: false, is_archived: true, payment_link: '', support_link: 'https://wa.me/5511999999999', group_link: '', notes: 'Arquivado.', created_at: createdAt, updated_at: createdAt },
    ],
    event_orders: [
      /* Festa da Família */
      { id: 1, family_id: 1, student_id: 1, service_id: 1, item_type: 'ticket', quantity: 3, amount: 180, order_date: '2026-04-20', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/festa-familia', support_link: 'https://wa.me/5511999999999', group_link: 'https://chat.whatsapp.com/festa-familia-2026', notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 2, family_id: 2, student_id: 3, service_id: 1, item_type: 'ticket', quantity: 2, amount: 120, order_date: '2026-04-21', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/festa-familia', support_link: 'https://wa.me/5511999999999', group_link: 'https://chat.whatsapp.com/festa-familia-2026', notes: '', created_at: createdAt, updated_at: createdAt },
      { id: 3, family_id: 5, student_id: 9, service_id: 1, item_type: 'ticket', quantity: 4, amount: 240, order_date: '2026-04-22', payment_status: 'pending', payment_link: 'https://pagamentos.altavista.edu.br/festa-familia', support_link: 'https://wa.me/5511999999999', group_link: 'https://chat.whatsapp.com/festa-familia-2026', notes: 'Aguardando pagamento', created_at: createdAt, updated_at: createdAt },
      { id: 4, family_id: 6, student_id: 12, service_id: 1, item_type: 'ticket', quantity: 2, amount: 120, order_date: '2026-04-23', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/festa-familia', support_link: 'https://wa.me/5511999999999', group_link: 'https://chat.whatsapp.com/festa-familia-2026', notes: '', created_at: createdAt, updated_at: createdAt },
      /* Camiseta Esportiva */
      { id: 5, family_id: 1, student_id: 1, service_id: 2, item_type: 'shirt', quantity: 1, amount: 85, order_date: '2026-04-15', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/camisas-jogos', support_link: 'https://wa.me/5511999999999', group_link: 'https://chat.whatsapp.com/jogos-internos', notes: 'Tam M', created_at: createdAt, updated_at: createdAt },
      { id: 6, family_id: 4, student_id: 6, service_id: 2, item_type: 'shirt', quantity: 2, amount: 170, order_date: '2026-04-16', payment_status: 'pending', payment_link: 'https://pagamentos.altavista.edu.br/camisas-jogos', support_link: 'https://wa.me/5511999999999', group_link: 'https://chat.whatsapp.com/jogos-internos', notes: 'Tam P e M', created_at: createdAt, updated_at: createdAt },
      { id: 7, family_id: 9, student_id: 18, service_id: 2, item_type: 'shirt', quantity: 1, amount: 85, order_date: '2026-04-17', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/camisas-jogos', support_link: 'https://wa.me/5511999999999', group_link: 'https://chat.whatsapp.com/jogos-internos', notes: 'Tam G', created_at: createdAt, updated_at: createdAt },
      /* Judô */
      { id: 8, family_id: 1, student_id: 1, service_id: 3, item_type: 'other', quantity: 1, amount: 150, order_date: '2026-03-05', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/judo', support_link: 'https://wa.me/5511988881111', group_link: 'https://chat.whatsapp.com/judo-cav', notes: 'Mensal', created_at: createdAt, updated_at: createdAt },
      { id: 9, family_id: 9, student_id: 18, service_id: 3, item_type: 'other', quantity: 1, amount: 150, order_date: '2026-03-05', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/judo', support_link: 'https://wa.me/5511988881111', group_link: 'https://chat.whatsapp.com/judo-cav', notes: 'Mensal', created_at: createdAt, updated_at: createdAt },
      /* Ballet */
      { id: 10, family_id: 4, student_id: 7, service_id: 4, item_type: 'other', quantity: 1, amount: 180, order_date: '2026-03-05', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/ballet', support_link: 'https://wa.me/5511988882222', group_link: 'https://chat.whatsapp.com/ballet-cav', notes: 'Mensal', created_at: createdAt, updated_at: createdAt },
      /* Catequese */
      { id: 11, family_id: 3, student_id: 5, service_id: 5, item_type: 'other', quantity: 1, amount: 120, order_date: '2026-03-10', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/catequese', support_link: 'https://wa.me/5511988883333', group_link: 'https://chat.whatsapp.com/catequese-cav', notes: 'Anual', created_at: createdAt, updated_at: createdAt },
      /* Futebol */
      { id: 12, family_id: 2, student_id: 3, service_id: 6, item_type: 'other', quantity: 1, amount: 130, order_date: '2026-03-05', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/futebol', support_link: 'https://wa.me/5511988884444', group_link: 'https://chat.whatsapp.com/futebol-cav', notes: 'Mensal', created_at: createdAt, updated_at: createdAt },
      { id: 13, family_id: 6, student_id: 12, service_id: 6, item_type: 'other', quantity: 1, amount: 130, order_date: '2026-03-05', payment_status: 'pending', payment_link: 'https://pagamentos.altavista.edu.br/futebol', support_link: 'https://wa.me/5511988884444', group_link: 'https://chat.whatsapp.com/futebol-cav', notes: 'Mensal — abr pendente', created_at: createdAt, updated_at: createdAt },
      /* Alimentação Especial */
      { id: 14, family_id: 1, student_id: 2, service_id: 7, item_type: 'other', quantity: 1, amount: 220, order_date: '2026-03-01', payment_status: 'paid', payment_link: 'https://pagamentos.altavista.edu.br/alimentacao-especial', support_link: 'https://wa.me/5511988885555', group_link: '', notes: 'Sem lactose', created_at: createdAt, updated_at: createdAt },
      { id: 15, family_id: 3, student_id: 5, service_id: 7, item_type: 'other', quantity: 1, amount: 220, order_date: '2026-03-01', payment_status: 'overdue', payment_link: 'https://pagamentos.altavista.edu.br/alimentacao-especial', support_link: 'https://wa.me/5511988885555', group_link: '', notes: 'Sem amendoim — abr em atraso', created_at: createdAt, updated_at: createdAt },
    ],
    financial_records: (() => {
      finId = 0
      const recs = []
      const months = ['2026-01', '2026-02', '2026-03', '2026-04']

      /* ── Mensalidades: ~R$1.200 per student, all 30 active students, 4 months ── */
      const activeIds = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]
      const stuFam = {1:1,2:1,3:2,4:2,5:3,6:4,7:4,8:4,9:5,10:5,11:5,12:6,13:6,14:7,15:7,16:8,17:8,18:9,19:9,20:10,21:10,22:11,23:11,24:12,25:12,26:6,27:7,28:9,29:10,30:11}
      const stuResp = {1:1,2:1,3:2,4:2,5:3,6:4,7:4,8:4,9:5,10:5,11:5,12:6,13:6,14:7,15:7,16:8,17:8,18:9,19:9,20:10,21:10,22:11,23:11,24:12,25:12,26:6,27:7,28:9,29:10,30:11}
      const amounts = [1200,1050,1200,1050,1350,1200,1200,1050,1200,1200,950,1200,1200,1350,1050,1100,1050,1200,1200,1200,1050,1200,1100,1200,1050,950,950,950,1200,1050]

      months.forEach((m, mi) => {
        activeIds.forEach((sid, si) => {
          const amt = amounts[si]
          let status
          if (mi <= 1) status = 'paid'                           // Jan-Feb all paid
          else if (mi === 2) status = si % 7 === 0 ? 'pending' : 'paid'  // Mar mostly paid
          else status = si % 5 === 0 ? 'overdue' : si % 3 === 0 ? 'pending' : 'paid' // Apr mixed
          const method = ['pix', 'boleto', 'card', 'pix'][mi]
          recs.push(fin(stuFam[sid], sid, stuResp[sid], 'mensalidade', amt, m, status, method, { inst: mi + 1, instTotal: 12 }))
        })
      })

      /* ── Matrículas – one-time in January ── */
      activeIds.forEach((sid) => {
        recs.push(fin(stuFam[sid], sid, stuResp[sid], 'matrícula', 950, '2026-01', 'paid', 'pix'))
      })

      /* ── Material didático – Feb ── */
      activeIds.slice(0, 20).forEach((sid) => {
        recs.push(fin(stuFam[sid], sid, stuResp[sid], 'material', 420, '2026-02', 'paid', 'card'))
      })

      /* ── Alimentação (extras) – Mar & Apr ── */
      ;[1,3,5,6,9,12,14,16,18,20,22,24].forEach((sid) => {
        recs.push(fin(stuFam[sid], sid, stuResp[sid], 'alimentação', 380, '2026-03', 'paid', 'boleto', { inst: 3, instTotal: 12 }))
        recs.push(fin(stuFam[sid], sid, stuResp[sid], 'alimentação', 380, '2026-04', sid % 4 === 0 ? 'pending' : 'paid', 'pix', { inst: 4, instTotal: 12 }))
      })

      /* ── Extracurriculares – Mar & Apr ── */
      ;[1,3,7,9,13,16,23].forEach((sid) => {
        recs.push(fin(stuFam[sid], sid, stuResp[sid], 'extracurricular', 180, '2026-03', 'paid', 'pix', { sub: 'esporte' }))
        recs.push(fin(stuFam[sid], sid, stuResp[sid], 'extracurricular', 180, '2026-04', 'pending', 'pix', { sub: 'esporte' }))
      })

      /* ── Saídas (despesas da escola) ── */
      months.forEach((m) => {
        recs.push(fin(null, null, null, 'alimentação', 1850, m, 'paid', 'pix', { sub: 'despesa_cozinha', flow: 'saída', notes: 'Insumos cozinha mensal' }))
        recs.push(fin(null, null, null, 'material', 620, m, 'paid', 'card', { sub: 'limpeza', flow: 'saída', notes: 'Materiais de limpeza' }))
        recs.push(fin(null, null, null, 'material', 890, m, 'paid', 'boleto', { sub: 'escritório', flow: 'saída', notes: 'Material de escritório' }))
      })

      return recs
    })(),
    audit_logs: [
      { id: 1, module: 'financeiro', entity_type: 'financial_record', entity_id: 8, action: 'status_atualizado', changed_by: 'Paula Ribeiro', changed_at: createdAt, details: 'Status alterado para inadimplente automaticamente.' },
      { id: 2, module: 'familias', entity_type: 'family', entity_id: 3, action: 'atualizacao', changed_by: 'Paula Ribeiro', changed_at: createdAt, details: 'Atualização de observações da família.' },
      { id: 3, module: 'alunos', entity_type: 'student', entity_id: 2, action: 'atualizacao', changed_by: 'Mariana Costa', changed_at: createdAt, details: 'Inclusão de atividade extracurricular.' },
    ],
    asset_catalog: [
      { id: 1, nome: 'Notebook Dell Latitude', categoria: 'Tecnologia', quantidade: 12, valor: 4200, localizacao: 'Laboratório 1', observacoes: 'Uso em aulas de informática', created_at: createdAt, updated_at: createdAt },
      { id: 2, nome: 'Projetor Epson PowerLite', categoria: 'Audiovisual', quantidade: 4, valor: 2800, localizacao: 'Sala dos professores', observacoes: 'Com controle remoto e cabo HDMI', created_at: createdAt, updated_at: createdAt },
      { id: 3, nome: 'Bolas de futsal Penalty', categoria: 'Esportes', quantidade: 15, valor: 95, localizacao: 'Quadra coberta', observacoes: 'Tamanho oficial', created_at: createdAt, updated_at: createdAt },
      { id: 4, nome: 'Mesa infantil madeira', categoria: 'Mobiliário', quantidade: 20, valor: 390, localizacao: 'Sala Infantil 4', observacoes: 'Cadeiras incluídas', created_at: createdAt, updated_at: createdAt },
      { id: 5, nome: 'Televisão Samsung 55"', categoria: 'Audiovisual', quantidade: 6, valor: 3200, localizacao: 'Salas de aula fund.', observacoes: 'Smart TV com WiFi', created_at: createdAt, updated_at: createdAt },
      { id: 6, nome: 'Kit de ciências', categoria: 'Didático', quantidade: 8, valor: 650, localizacao: 'Laboratório 2', observacoes: 'Microscópio + lâminas + reagentes', created_at: createdAt, updated_at: createdAt },
      { id: 7, nome: 'Impressora HP LaserJet', categoria: 'Tecnologia', quantidade: 3, valor: 1800, localizacao: 'Secretaria', observacoes: 'Toner incluso', created_at: createdAt, updated_at: createdAt },
      { id: 8, nome: 'Ar condicionado Split 12000 BTU', categoria: 'Infraestrutura', quantidade: 10, valor: 2100, localizacao: 'Salas de aula', observacoes: 'Manutenção semestral', created_at: createdAt, updated_at: createdAt },
      { id: 9, nome: 'Colchonete EVA', categoria: 'Esportes', quantidade: 30, valor: 45, localizacao: 'Sala de educação física', observacoes: 'Para atividades no chão', created_at: createdAt, updated_at: createdAt },
      { id: 10, nome: 'Armário de aço 2 portas', categoria: 'Mobiliário', quantidade: 12, valor: 580, localizacao: 'Salas dos professores', observacoes: '', created_at: createdAt, updated_at: createdAt },
    ],
    library_books: [
      { id: 1, nome: 'O Pequeno Príncipe', autor: 'Antoine de Saint-Exupéry', categoria: 'Literatura', status: 'disponível', student_id: null, loan_date: null, due_date: null, return_date: null, observacoes: '', created_at: createdAt, updated_at: createdAt },
      { id: 2, nome: 'Capitães da Areia', autor: 'Jorge Amado', categoria: 'Literatura Brasileira', status: 'emprestado', student_id: 1, loan_date: '2026-04-05', due_date: '2026-04-20', return_date: null, observacoes: 'Leitura bimestral.', created_at: createdAt, updated_at: createdAt },
      { id: 3, nome: 'Matemática Divertida', autor: 'Malu F. Alves', categoria: 'Didático', status: 'disponível', student_id: null, loan_date: null, due_date: null, return_date: null, observacoes: '', created_at: createdAt, updated_at: createdAt },
      { id: 4, nome: 'Ciência em Ação', autor: 'Carlos Nobre', categoria: 'Ciências', status: 'emprestado', student_id: 5, loan_date: '2026-04-08', due_date: '2026-04-22', return_date: null, observacoes: '', created_at: createdAt, updated_at: createdAt },
      { id: 5, nome: 'Dom Casmurro', autor: 'Machado de Assis', categoria: 'Literatura Brasileira', status: 'disponível', student_id: null, loan_date: null, due_date: null, return_date: null, observacoes: '', created_at: createdAt, updated_at: createdAt },
      { id: 6, nome: 'A Revolução dos Bichos', autor: 'George Orwell', categoria: 'Literatura', status: 'emprestado', student_id: 14, loan_date: '2026-04-12', due_date: '2026-04-26', return_date: null, observacoes: 'Projeto de leitura 9A', created_at: createdAt, updated_at: createdAt },
      { id: 7, nome: 'Atlas Geográfico Escolar', autor: 'IBGE', categoria: 'Didático', status: 'disponível', student_id: null, loan_date: null, due_date: null, return_date: null, observacoes: '6a edição', created_at: createdAt, updated_at: createdAt },
      { id: 8, nome: 'O Diário de Anne Frank', autor: 'Anne Frank', categoria: 'Literatura', status: 'emprestado', student_id: 9, loan_date: '2026-04-15', due_date: '2026-04-29', return_date: null, observacoes: '', created_at: createdAt, updated_at: createdAt },
      { id: 9, nome: 'Vidas Secas', autor: 'Graciliano Ramos', categoria: 'Literatura Brasileira', status: 'disponível', student_id: null, loan_date: null, due_date: null, return_date: null, observacoes: '', created_at: createdAt, updated_at: createdAt },
      { id: 10, nome: 'Introdução à Robótica', autor: 'Pedro Silva', categoria: 'Ciências', status: 'disponível', student_id: null, loan_date: null, due_date: null, return_date: null, observacoes: 'Novo — doação', created_at: createdAt, updated_at: createdAt },
    ],
    student_tags: [
      { id: 1, student_id: 1, tag: 'alimentação', category: 'alimentação', created_at: createdAt },
      { id: 2, student_id: 1, tag: 'campeonato', category: 'histórico', created_at: createdAt },
      { id: 3, student_id: 2, tag: 'alimentação', category: 'operacional', created_at: createdAt },
      { id: 4, student_id: 3, tag: 'evento_familia', category: 'eventos', created_at: createdAt },
      { id: 5, student_id: 4, tag: 'vmap', category: 'acadêmico', created_at: createdAt },
      { id: 6, student_id: 5, tag: 'campeão', category: 'histórico', created_at: createdAt },
      { id: 7, student_id: 5, tag: 'observação_importante', category: 'alerta', created_at: createdAt },
      { id: 8, student_id: 12, tag: 'campeonato', category: 'histórico', created_at: createdAt },
      { id: 9, student_id: 9, tag: 'evento_familia', category: 'eventos', created_at: createdAt },
      { id: 10, student_id: 14, tag: 'alimentação', category: 'alimentação', created_at: createdAt },
      { id: 11, student_id: 18, tag: 'campeonato', category: 'histórico', created_at: createdAt },
      { id: 12, student_id: 22, tag: 'vmap', category: 'acadêmico', created_at: createdAt },
    ],
    tag_registry: [
      { id: 1, tag: 'bolsa_segundo_filho', category: 'bolsa', created_at: createdAt },
      { id: 2, tag: 'bolsa_terceiro_filho', category: 'bolsa', created_at: createdAt },
      { id: 3, tag: 'bolsa_secretaria_educacao', category: 'bolsa', created_at: createdAt },
      { id: 4, tag: 'alimentação', category: 'alimentação', created_at: createdAt },
      { id: 5, tag: 'campeonato', category: 'histórico', created_at: createdAt },
      { id: 6, tag: 'campeão', category: 'histórico', created_at: createdAt },
      { id: 7, tag: 'vmap', category: 'administrativo', created_at: createdAt },
      { id: 8, tag: 'evento_familia', category: 'evento', created_at: createdAt },
    ],
    class_reports: [
      {
        id: 1,
        class_name: '7A',
        employee_id: 1,
        report_date: '2026-04-10',
        link_documento: 'https://docs.google.com/document/d/relatorio-7a',
        notes: 'Resumo da semana e desempenho geral.',
        is_archived: false,
        created_at: createdAt,
        updated_at: createdAt,
      },
      {
        id: 2,
        class_name: '6A',
        employee_id: 1,
        report_date: '2026-04-11',
        link_documento: 'https://docs.google.com/document/d/relatorio-6a',
        notes: '',
        is_archived: false,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ],
    pedagogical_plans: [
      {
        id: 1,
        class_name: '7A',
        employee_id: 1,
        title: 'Planejamento de Ciências - Abril',
        plan_date: '2026-04-08',
        link_documento: 'https://docs.google.com/document/d/planejamento-ciencias',
        is_archived: false,
        created_at: createdAt,
        updated_at: createdAt,
      },
      {
        id: 2,
        class_name: '6A',
        employee_id: 1,
        title: 'Planejamento de Português - Abril',
        plan_date: '2026-04-09',
        link_documento: 'https://docs.google.com/document/d/planejamento-portugues',
        is_archived: false,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ],
    attendance_records: [
      { id: 1, student_id: 1, class_name: '7A', attendance_date: '2026-04-14', status: 'presente', employee_id: 1, notes: '', current_activity: 'aula', exit_time: null, created_at: createdAt, updated_at: createdAt },
      { id: 2, student_id: 2, class_name: 'Infantil 5', attendance_date: '2026-04-14', status: 'presente', employee_id: 9, notes: '', current_activity: 'extracurricular', exit_time: null, created_at: createdAt, updated_at: createdAt },
      { id: 3, student_id: 3, class_name: '6A', attendance_date: '2026-04-14', status: 'ausente', employee_id: 7, notes: 'Consulta médica.', current_activity: 'aula', exit_time: null, created_at: createdAt, updated_at: createdAt },
      { id: 4, student_id: 4, class_name: 'Infantil 4', attendance_date: '2026-04-14', status: 'presente', employee_id: 9, notes: '', current_activity: 'aula', exit_time: '2026-04-14T18:05:00.000Z', created_at: createdAt, updated_at: createdAt },
      { id: 5, student_id: 5, class_name: '9A', attendance_date: '2026-04-14', status: 'presente', employee_id: 5, notes: '', current_activity: 'plantão', exit_time: null, created_at: createdAt, updated_at: createdAt },
    ],
    categories: defaultChartOfAccounts.map((cat) => ({ ...cat, created_at: createdAt, updated_at: createdAt })),
    activity_tags: [],
    student_activity_tags: [],
    student_checkout_daily: [],
    student_checkout_logs: [],
    contracts: [],
    bank_statements: [],
    recurring_templates: [],
    settings: {
      period_lock_date: null,
    },
  }
}

function normalizeShape(data) {
  const seed = createSeed()
  const normalized = {
    ...seed,
    ...data,
    counters: {
      ...seed.counters,
      ...(data?.counters || {}),
    },
    families: Array.isArray(data?.families) ? data.families : seed.families,
    responsibles: Array.isArray(data?.responsibles) ? data.responsibles : seed.responsibles,
    students: Array.isArray(data?.students) ? data.students : seed.students,
    employees: Array.isArray(data?.employees) ? data.employees : seed.employees,
    meal_contracts: Array.isArray(data?.meal_contracts) ? data.meal_contracts : seed.meal_contracts,
    events: Array.isArray(data?.events) ? data.events : seed.events,
    event_orders: Array.isArray(data?.event_orders) ? data.event_orders : seed.event_orders,
    student_tags: Array.isArray(data?.student_tags) ? data.student_tags : seed.student_tags,
    tag_registry: Array.isArray(data?.tag_registry) ? data.tag_registry : seed.tag_registry,
    class_reports: Array.isArray(data?.class_reports) ? data.class_reports : seed.class_reports,
    pedagogical_plans: Array.isArray(data?.pedagogical_plans) ? data.pedagogical_plans : seed.pedagogical_plans,
    attendance_records: Array.isArray(data?.attendance_records) ? data.attendance_records : seed.attendance_records,
    financial_records: Array.isArray(data?.financial_records) ? data.financial_records : seed.financial_records,
    audit_logs: Array.isArray(data?.audit_logs) ? data.audit_logs : seed.audit_logs,
    activity_tags: Array.isArray(data?.activity_tags) ? data.activity_tags : seed.activity_tags,
    student_activity_tags: Array.isArray(data?.student_activity_tags) ? data.student_activity_tags : seed.student_activity_tags,
    student_checkout_daily: Array.isArray(data?.student_checkout_daily) ? data.student_checkout_daily : seed.student_checkout_daily,
    student_checkout_logs: Array.isArray(data?.student_checkout_logs) ? data.student_checkout_logs : seed.student_checkout_logs,
    asset_catalog: Array.isArray(data?.asset_catalog) ? data.asset_catalog : seed.asset_catalog,
    library_books: Array.isArray(data?.library_books) ? data.library_books : seed.library_books,
    categories: Array.isArray(data?.categories) ? data.categories : seed.categories,
    contracts: Array.isArray(data?.contracts) ? data.contracts : seed.contracts,
    bank_statements: Array.isArray(data?.bank_statements) ? data.bank_statements : seed.bank_statements,
    recurring_templates: Array.isArray(data?.recurring_templates) ? data.recurring_templates : seed.recurring_templates,
    settings: data?.settings ? { ...seed.settings, ...data.settings } : seed.settings,
  }

  normalized.events = normalized.events.map((event) => ({
    kind: 'evento',
    is_archived: false,
    payment_link: '',
    support_link: 'https://wa.me/5511999999999',
    group_link: 'https://chat.whatsapp.com/exemplo-cav-os',
    ...event,
  }))

  normalized.event_orders = normalized.event_orders.map((order) => ({
    service_id: order.service_id ?? order.event_id ?? null,
    payment_link: order.payment_link ?? '',
    support_link: order.support_link ?? 'https://wa.me/5511999999999',
    group_link: order.group_link ?? 'https://chat.whatsapp.com/exemplo-cav-os',
    updated_at: order.updated_at ?? order.created_at ?? nowIso(),
    ...order,
  }))

  normalized.students = normalized.students.map((student) => ({
    ano_entrada: student.ano_entrada ?? new Date(student.created_at || nowIso()).getFullYear(),
    ano_atual_matricula: student.ano_atual_matricula ?? new Date().getFullYear(),
    has_scholarship: student.has_scholarship ?? false,
    scholarship_type: student.scholarship_type ?? '',
    scholarship_notes: student.scholarship_notes ?? '',
    extracurricular_activities: Array.isArray(student.extracurricular_activities)
      ? student.extracurricular_activities
      : [],
    extracurricular_other: student.extracurricular_other ?? '',
    jantar_contratado: student.jantar_contratado ?? false,
    plantao_ativo: student.plantao_ativo ?? false,
    ...student,
  }))

  normalized.families = normalized.families.map((family, index) => ({
    family_code: family.family_code ?? `FAM-${String(family.id ?? index + 1).padStart(4, '0')}`,
    has_scholarship: family.has_scholarship ?? false,
    scholarship_notes: family.scholarship_notes ?? '',
    ...family,
  }))

  normalized.class_reports = normalized.class_reports.map((item) => ({
    is_archived: item.is_archived ?? false,
    ...item,
  }))

  normalized.pedagogical_plans = normalized.pedagogical_plans.map((item) => ({
    is_archived: item.is_archived ?? false,
    ...item,
  }))

  normalized.employees = normalized.employees.map((employee) => ({
    access_type: ['administrador', 'secretaria', 'cozinha', 'financeiro', 'professor'].includes(employee.access_type)
      ? employee.access_type
      : 'secretaria',
    role: ['administrador', 'secretaria', 'cozinha', 'financeiro', 'professor'].includes(employee.role)
      ? employee.role
      : 'secretaria',
    ...employee,
  }))

  normalized.attendance_records = normalized.attendance_records.map((item) => ({
    current_activity: item.current_activity ?? 'aula',
    current_location_or_status: item.current_location_or_status
      ?? (item.current_activity === 'plantão'
        ? 'em plantão'
        : item.current_activity === 'extracurricular'
          ? 'em atividade extracurricular'
          : item.current_activity === 'fora da escola'
            ? 'fora da escola'
            : 'em aula'),
    is_in_school: typeof item.is_in_school === 'boolean' ? item.is_in_school : item.status !== 'ausente',
    last_status_update_at: item.last_status_update_at ?? item.updated_at ?? nowIso(),
    last_status_updated_by: item.last_status_updated_by ?? 'Sistema',
    exit_time: item.exit_time ?? null,
    ...item,
  }))

  normalized.financial_records = normalized.financial_records.map((item) => ({
    item_type: item.item_type ?? 'material',
    item_subtype: item.item_subtype ?? '',
    reference_month: String(item.reference_month || item.due_date || '').slice(0, 7),
    installment_number: Number(item.installment_number || 1),
    installment_total: Number(item.installment_total || 1),
    scholarship_type: item.scholarship_type ?? '',
    scholarship_tag: item.scholarship_tag ?? item.scholarship_type ?? '',
    paid_in_cash: item.paid_in_cash ?? item.payment_method === 'cash',
    payment_method: item.payment_method || (item.paid_in_cash ? 'cash' : 'boleto'),
    cash_flow_type: item.cash_flow_type === 'saída' ? 'saída' : 'entrada',
    category_code: item.category_code ?? null,
    contract_id: item.contract_id ?? null,
    cancelled_at: item.cancelled_at ?? null,
    cancelled_reason: item.cancelled_reason ?? null,
    renegotiated_from_id: item.renegotiated_from_id ?? null,
    conciliated_at: item.conciliated_at ?? null,
    bank_statement_ref: item.bank_statement_ref ?? null,
    ...item,
  }))

  normalized.student_checkout_daily = normalized.student_checkout_daily.map((item) => ({
    note: item.note ?? '',
    verification_note: item.verification_note ?? '',
    pickup_person_name: item.pickup_person_name ?? '',
    pickup_guardian_name: item.pickup_guardian_name ?? '',
    device_label: item.device_label ?? '',
    ...item,
  }))

  normalized.student_checkout_logs = normalized.student_checkout_logs.map((item) => ({
    note: item.note ?? '',
    pickup_guardian_name: item.pickup_guardian_name ?? '',
    pickup_person_name: item.pickup_person_name ?? '',
    device_label: item.device_label ?? '',
    ...item,
  }))

  normalized.asset_catalog = normalized.asset_catalog.map((item) => ({
    valor: Number(item.valor || 0),
    ...item,
  }))

  normalized.library_books = normalized.library_books.map((item) => ({
    loan_date: item.loan_date ?? null,
    due_date: item.due_date ?? null,
    return_date: item.return_date ?? null,
    observacoes: item.observacoes ?? '',
    ...item,
  }))

  normalized.counters.families = Math.max(normalized.counters.families || 0, ...normalized.families.map((item) => Number(item.id) || 0))
  normalized.counters.responsibles = Math.max(normalized.counters.responsibles || 0, ...normalized.responsibles.map((item) => Number(item.id) || 0))
  normalized.counters.students = Math.max(normalized.counters.students || 0, ...normalized.students.map((item) => Number(item.id) || 0))
  normalized.counters.employees = Math.max(normalized.counters.employees || 0, ...normalized.employees.map((item) => Number(item.id) || 0))
  normalized.counters.meal_contracts = Math.max(normalized.counters.meal_contracts || 0, ...normalized.meal_contracts.map((item) => Number(item.id) || 0))
  normalized.counters.events = Math.max(normalized.counters.events || 0, ...normalized.events.map((item) => Number(item.id) || 0))
  normalized.counters.event_orders = Math.max(normalized.counters.event_orders || 0, ...normalized.event_orders.map((item) => Number(item.id) || 0))
  normalized.counters.student_tags = Math.max(normalized.counters.student_tags || 0, ...normalized.student_tags.map((item) => Number(item.id) || 0))
  normalized.counters.class_reports = Math.max(normalized.counters.class_reports || 0, ...normalized.class_reports.map((item) => Number(item.id) || 0))
  normalized.counters.pedagogical_plans = Math.max(normalized.counters.pedagogical_plans || 0, ...normalized.pedagogical_plans.map((item) => Number(item.id) || 0))
  normalized.counters.attendance_records = Math.max(normalized.counters.attendance_records || 0, ...normalized.attendance_records.map((item) => Number(item.id) || 0))
  normalized.counters.tag_registry = Math.max(normalized.counters.tag_registry || 0, ...normalized.tag_registry.map((item) => Number(item.id) || 0))
  normalized.counters.financial_records = Math.max(normalized.counters.financial_records || 0, ...normalized.financial_records.map((item) => Number(item.id) || 0))
  normalized.counters.audit_logs = Math.max(normalized.counters.audit_logs || 0, ...normalized.audit_logs.map((item) => Number(item.id) || 0))
  normalized.counters.activity_tags = Math.max(normalized.counters.activity_tags || 0, ...normalized.activity_tags.map((item) => Number(item.id) || 0), 0)
  normalized.counters.student_activity_tags = Math.max(normalized.counters.student_activity_tags || 0, ...normalized.student_activity_tags.map((item) => Number(item.id) || 0), 0)
  normalized.counters.student_checkout_daily = Math.max(normalized.counters.student_checkout_daily || 0, ...normalized.student_checkout_daily.map((item) => Number(item.id) || 0), 0)
  normalized.counters.student_checkout_logs = Math.max(normalized.counters.student_checkout_logs || 0, ...normalized.student_checkout_logs.map((item) => Number(item.id) || 0), 0)
  normalized.counters.asset_catalog = Math.max(normalized.counters.asset_catalog || 0, ...normalized.asset_catalog.map((item) => Number(item.id) || 0))
  normalized.counters.library_books = Math.max(normalized.counters.library_books || 0, ...normalized.library_books.map((item) => Number(item.id) || 0))
  normalized.counters.categories = Math.max(normalized.counters.categories || 0, ...normalized.categories.map((item) => Number(item.id) || 0))
  normalized.counters.contracts = Math.max(normalized.counters.contracts || 0, ...normalized.contracts.map((item) => Number(item.id) || 0), 0)
  normalized.counters.bank_statements = Math.max(normalized.counters.bank_statements || 0, ...normalized.bank_statements.map((item) => Number(item.id) || 0), 0)
  normalized.counters.recurring_templates = Math.max(normalized.counters.recurring_templates || 0, ...normalized.recurring_templates.map((item) => Number(item.id) || 0), 0)

  return normalized
}

export class LocalDatabase {
  constructor(storage = window.localStorage) {
    this.storage = storage
  }

  read() {
    const raw = this.storage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = createSeed()
      this.write(seed)
      return seed
    }

    try {
      const parsed = JSON.parse(raw)
      const normalized = normalizeShape(parsed)

      if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
        this.write(normalized)
      }

      return normalized
    } catch {
      const seed = createSeed()
      this.write(seed)
      return seed
    }
  }

  write(data) {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  nextId(table) {
    const data = this.read()
    const current = data.counters[table] ?? 0
    data.counters[table] = current + 1
    this.write(data)
    return data.counters[table]
  }
}
