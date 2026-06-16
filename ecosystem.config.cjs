/**
 * pm2 process manifest — VeritusOS Internal (physical school server, Windows).
 *
 * Runs the three services as managed, auto-restarting processes:
 *   - veritus-search    Search/Secretaria API   :3001
 *   - veritus-checkout  Saída de Alunos API      :3333
 *   - veritus-web       Frontend (vite preview)  :5173
 *
 * Each is launched via `node <entrypoint>` directly (NOT `npm run ...`) so it
 * works the same on Windows as on Mac/Linux — no npm.cmd / shell quirks.
 *
 * Build the frontend once before first start:  npm run build
 * Start everything:   pm2 start ecosystem.config.cjs
 * Persist for boot:   pm2 save
 *
 * Adjust SERVER_IP below to the server's static IP (used for CORS).
 */
const DB_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/veritus_os'
const SERVER_IP = process.env.SERVER_IP || '192.168.0.10' // <-- set to the real static IP
const WEB_PORT = 5173
const CORS = `http://${SERVER_IP}:${WEB_PORT},http://localhost:${WEB_PORT}`

module.exports = {
  apps: [
    {
      name: 'veritus-search',
      script: 'server/index.js',
      env: { DATABASE_URL: DB_URL, PORT: '3001', CORS_ORIGINS: CORS },
      autorestart: true,
      max_restarts: 20,
      out_file: 'logs/search-out.log',
      error_file: 'logs/search-err.log',
      time: true,
    },
    {
      name: 'veritus-checkout',
      script: 'scripts/checkout-pg-server.js',
      env: {
        DATABASE_URL: DB_URL, PORT: '3333',
        SEARCH_PORT: '3001', WEB_PORT: String(WEB_PORT),
        BACKUP_DIR: process.env.BACKUP_DIR || 'C:\\veritus\\backups', // health aggregator reads latest backup here
      },
      autorestart: true,
      max_restarts: 20,
      out_file: 'logs/checkout-out.log',
      error_file: 'logs/checkout-err.log',
      time: true,
    },
    {
      name: 'veritus-web',
      script: 'node_modules/vite/bin/vite.js',
      args: `preview --host --port ${WEB_PORT}`,
      autorestart: true,
      max_restarts: 20,
      out_file: 'logs/web-out.log',
      error_file: 'logs/web-err.log',
      time: true,
    },
  ],
}
