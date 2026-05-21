const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CHECKOUT_TEST_PASSWORD']

const USERS = [
  {
    email: 'recepcao@cav.local',
    metadata: {
      full_name: 'Recepção',
      access_type: 'reception',
      role: 'reception',
    },
  },
  {
    email: 'infantil@cav.local',
    metadata: {
      full_name: 'Coordenação Infantil',
      access_type: 'infantil_coordination',
      role: 'infantil_coordination',
    },
  },
  {
    email: 'fundamental@cav.local',
    metadata: {
      full_name: 'Coordenação Fundamental',
      access_type: 'fundamental_coordination',
      role: 'fundamental_coordination',
    },
  },
  {
    email: 'suporte@cav.local',
    metadata: {
      full_name: 'Suporte',
      access_type: 'support',
      role: 'support',
    },
  },
]

function requireEnv(name) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function adminHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && (payload.msg || payload.error_description || payload.message)) ||
      (typeof payload === 'string' && payload) ||
      `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

async function listAllUsers(baseUrl, serviceRoleKey) {
  const users = []
  let page = 1
  const perPage = 100

  while (true) {
    const url = new URL(`${baseUrl}/auth/v1/admin/users`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('per_page', String(perPage))
    const payload = await requestJson(url, { headers: adminHeaders(serviceRoleKey) })
    const pageUsers = payload?.users || []
    users.push(...pageUsers)
    if (pageUsers.length < perPage) break
    page += 1
  }

  return users
}

async function findUserByEmail(baseUrl, serviceRoleKey, email) {
  const target = String(email || '').trim().toLowerCase()
  const users = await listAllUsers(baseUrl, serviceRoleKey)
  return users.find((user) => String(user.email || '').trim().toLowerCase() === target) || null
}

async function createUser(baseUrl, serviceRoleKey, userSpec, password) {
  return requestJson(`${baseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(serviceRoleKey),
    body: JSON.stringify({
      email: userSpec.email,
      password,
      email_confirm: true,
      user_metadata: userSpec.metadata,
    }),
  })
}

async function updateUser(baseUrl, serviceRoleKey, userId, userMetadata, password) {
  return requestJson(`${baseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: adminHeaders(serviceRoleKey),
    body: JSON.stringify({
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    }),
  })
}

async function upsertUser(baseUrl, serviceRoleKey, userSpec, password) {
  const existing = await findUserByEmail(baseUrl, serviceRoleKey, userSpec.email)
  if (existing) {
    const nextMetadata = {
      ...(existing.user_metadata || {}),
      ...userSpec.metadata,
    }
    const updated = await updateUser(baseUrl, serviceRoleKey, existing.id, nextMetadata, password)
    return {
      action: 'updated',
      id: updated?.id || existing.id,
      email: updated?.email || existing.email || userSpec.email,
      metadata: nextMetadata,
    }
  }

  const created = await createUser(baseUrl, serviceRoleKey, userSpec, password)
  return {
    action: 'created',
    id: created?.id || null,
    email: created?.email || userSpec.email,
    metadata: userSpec.metadata,
  }
}

async function main() {
  try {
    const missing = REQUIRED_ENV_VARS.filter((name) => !String(process.env[name] || '').trim())
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    const baseUrl = normalizeBaseUrl(requireEnv('SUPABASE_URL'))
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const password = requireEnv('CHECKOUT_TEST_PASSWORD')
    if (password.length < 8) {
      throw new Error('CHECKOUT_TEST_PASSWORD must be at least 8 characters long.')
    }

    const results = []
    for (const userSpec of USERS) {
      const result = await upsertUser(baseUrl, serviceRoleKey, userSpec, password)
      results.push(result)
      console.log(`${result.action.toUpperCase()}: ${userSpec.email}`)
    }

    console.log('\nSummary:')
    for (const result of results) {
      console.log(`- ${result.action}: ${result.email} (${result.id || 'no-id'})`)
    }

    console.log('\nLogin setup:')
    console.log('- Use the four accounts below with the temporary password from CHECKOUT_TEST_PASSWORD.')
    console.log('- Rotate or delete them after the pilot demo if they are no longer needed.')
    USERS.forEach((user) => {
      console.log(`  - ${user.email} -> ${user.metadata.access_type}`)
    })
  } catch (error) {
    console.error(`Seed failed: ${error.message}`)
    process.exitCode = 1
  }
}

await main()
