function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const email = process.argv[2] || process.env.CHECKOUT_TEST_EMAIL || 'recepcao@cav.local'
  const password = process.env.CHECKOUT_TEST_PASSWORD || process.argv[3]

  if (!baseUrl) throw new Error('Missing required environment variable: VITE_SUPABASE_URL or SUPABASE_URL')
  if (!anonKey) throw new Error('Missing required environment variable: VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY')
  if (!password) throw new Error('Missing required environment variable: CHECKOUT_TEST_PASSWORD')

  const url = `${baseUrl}/auth/v1/token?grant_type=password`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

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

  console.log(JSON.stringify({
    ok: true,
    project_url: baseUrl,
    email: payload?.user?.email || email,
    user_id: payload?.user?.id || null,
    confirmed: Boolean(payload?.user?.email_confirmed_at),
    access_type: payload?.user?.user_metadata?.access_type || null,
    role: payload?.user?.user_metadata?.role || null,
  }, null, 2))
}

main().catch((error) => {
  console.error(`LOGIN_TEST_FAILED: ${error.message}`)
  process.exitCode = 1
})
