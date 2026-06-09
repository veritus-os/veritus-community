# VeritusOS — Guia de Instalação do Servidor Escolar

## Resumo

Este guia cobre a instalação completa do VeritusOS em um computador dedicado na escola.
Funciona em **macOS** e **Windows**.

**Tempo estimado:** 30-60 minutos

## Requisitos

| Item | Mínimo | Recomendado |
|------|--------|-------------|
| Sistema operacional | Windows 10/11 ou macOS 12+ | Windows 11 ou macOS 13+ |
| RAM | 4 GB | 8 GB |
| Disco | 5 GB livres | 20 GB livres |
| Rede | WiFi na mesma rede da escola | Cabo ethernet (mais estável) |
| Navegador | Chrome, Edge, ou Safari | Chrome |

## Software Necessário

| Software | Versão | Download |
|----------|--------|----------|
| Node.js | 20 LTS | https://nodejs.org/ |
| PostgreSQL | 17 | https://www.postgresql.org/download/ |
| Git | Qualquer | https://git-scm.com/downloads |

---

## Passo 1: Instalar Software

### Windows

```powershell
# 1. Instale o Node.js 20 LTS
#    Baixe de https://nodejs.org/ e execute o instalador

# 2. Instale o PostgreSQL 17
#    Baixe de https://www.postgresql.org/download/windows/
#    Durante a instalação:
#    - Anote a senha do superusuário postgres
#    - Porta padrão: 5432
#    - Marque "pgAdmin" (opcional mas útil)

# 3. Instale o Git
#    Baixe de https://git-scm.com/download/windows

# 4. Verifique instalação (abra o PowerShell)
node --version    # Deve mostrar v20.x.x
npm --version     # Deve mostrar 10.x.x
git --version     # Deve mostrar git version 2.x.x
```

### macOS

```bash
# 1. Instale o Homebrew (se não tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Instale Node.js, PostgreSQL, Git
brew install node@20 postgresql@17 git

# 3. Inicie o PostgreSQL
brew services start postgresql@17

# 4. Verifique
node --version
npm --version
pg_isready
```

---

## Passo 2: Clonar o Repositório

```bash
# Escolha um diretório de trabalho
mkdir -p ~/veritus
cd ~/veritus

# Clone o repositório principal
git clone https://github.com/veritus-os/veritus-community.git
cd veritus-community

# Instale dependências Node
npm install
```

---

## Passo 3: Criar o Banco de Dados

### Windows (PowerShell ou pgAdmin)

```powershell
# Via linha de comando (se psql está no PATH)
createdb -U postgres veritus_os

# Ou via pgAdmin:
# 1. Abra pgAdmin
# 2. Clique direito em "Databases" → "Create" → "Database"
# 3. Nome: veritus_os
# 4. Salve
```

### macOS

```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
createdb veritus_os
```

### Aplicar Schema

```bash
# macOS
psql veritus_os < server/migrations/001_schema.sql
psql veritus_os < server/migrations/002_saved_queries.sql

# Windows (ajuste o caminho do psql)
psql -U postgres veritus_os < server/migrations/001_schema.sql
psql -U postgres veritus_os < server/migrations/002_saved_queries.sql
```

---

## Passo 4: Restaurar Dados

Copie o arquivo de backup mais recente para o servidor.

### Do Mac do Aleff para o servidor:

```bash
# No Mac do Aleff — copie via USB, rede, ou e-mail:
# Arquivo: ~/workspace/veritus-os/backups/db/veritus_os_XXXXXXXX.sql.gz
```

### No servidor:

```bash
# macOS
gunzip -c veritus_os_XXXXXXXX.sql.gz | psql veritus_os

# Windows (PowerShell)
# Primeiro instale gzip: choco install gzip
# Ou use 7-zip para descompactar, depois:
psql -U postgres veritus_os < veritus_os_XXXXXXXX.sql
```

### Verificar dados:

```bash
psql veritus_os -c "
SELECT 'students' AS tbl, count(*) AS n FROM students WHERE active = true
UNION ALL SELECT 'guardians', count(*) FROM guardians
UNION ALL SELECT 'meal_subscriptions', count(*) FROM meal_subscriptions
UNION ALL SELECT 'staff_users', count(*) FROM staff_users;"
```

**Esperado:** students=385, guardians=916, meals=1014, staff=4+

---

## Passo 5: Configurar Variáveis de Ambiente

### Para o módulo Search/Secretaria:

Crie o arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://ibbqlyznldqpexymmfaq.supabase.co
VITE_SUPABASE_ANON_KEY=<chave-anon-do-supabase>
VITE_CHECKOUT_SUPABASE_LOW_EGRESS=true
```

### Para o servidor API:

O servidor API usa o banco local por padrão (`postgres://localhost:5432/veritus_os`).
Se o PostgreSQL usar senha (Windows), crie um arquivo `.env` no diretório `server/`:

```env
DATABASE_URL=postgres://postgres:SUA_SENHA@localhost:5432/veritus_os
JWT_SECRET=gere-uma-chave-aleatoria-aqui
```

**NUNCA comite esses arquivos no Git.**

---

## Passo 6: Iniciar o Sistema

### Terminal 1 — API Server:

```bash
cd ~/veritus/veritus-community
npm run api
# Deve mostrar: VeritusOS API running — http://localhost:3001
```

### Terminal 2 — Frontend:

```bash
cd ~/veritus/veritus-community
npm run dev -- --host
# Deve mostrar: Local: http://localhost:5173
#               Network: http://192.168.X.X:5173
```

### Verificar:

- Abra `http://localhost:3001/api/health` → deve mostrar `{"status":"ok","students":385}`
- Abra `http://localhost:5173` → deve abrir a tela de login

---

## Passo 7: Acesso pela Rede Local

Outros computadores na mesma rede WiFi podem acessar usando o IP do servidor.

### Descobrir o IP:

```bash
# macOS
ipconfig getifaddr en0

# Windows
ipconfig
# Procure "IPv4 Address" na conexão WiFi ou Ethernet
```

### Acessar:

- **Search/Secretaria:** `http://192.168.X.X:5173/search`
- **Student Checkout:** `http://192.168.X.X:5173/checkout`
- **Login:** `http://192.168.X.X:5173/login`

---

## Passo 8: Configurar Backup Automático

### macOS

```bash
# Criar diretório de backup
mkdir -p ~/veritus/backups/db

# Adicionar ao cron (executa diariamente às 22:00)
crontab -e
# Adicione a linha:
0 22 * * * cd ~/veritus/veritus-community && BACKUP_DIR=~/veritus/backups/db bash server/scripts/backup.sh >> /tmp/veritus-backup.log 2>&1
```

### Windows (Agendador de Tarefas)

1. Abra o "Agendador de Tarefas"
2. Crie nova tarefa básica:
   - Nome: "VeritusOS Backup"
   - Disparador: Diariamente às 22:00
   - Ação: Iniciar programa
   - Programa: `pg_dump`
   - Argumentos: `-U postgres veritus_os > C:\veritus\backups\veritus_os_%date%.sql`
3. Ou crie um script `.bat`:

```bat
@echo off
set BACKUP_DIR=C:\veritus\backups
set FILENAME=%BACKUP_DIR%\veritus_os_%date:~-4%-%date:~3,2%-%date:~0,2%.sql
pg_dump -U postgres veritus_os > "%FILENAME%"
```

---

## Passo 9: Inicialização Automática (Opcional)

### macOS (launchd)

Crie `~/Library/LaunchAgents/com.veritus.api.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.veritus.api</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>server/index.js</string>
    </array>
    <key>WorkingDirectory</key><string>/Users/USUARIO/veritus/veritus-community</string>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
</dict>
</plist>
```

### Windows (Serviço)

Use `pm2` (gerenciador de processos Node):

```powershell
npm install -g pm2
cd C:\veritus\veritus-community
pm2 start server/index.js --name veritus-api
pm2 startup   # Configura auto-start no boot
pm2 save
```

---

## Passo 10: Verificação Final

### Checklist de Verificação

```
[ ] Node.js instalado e no PATH
[ ] PostgreSQL rodando e acessível
[ ] Banco veritus_os criado e com dados
[ ] npm install executado
[ ] .env.local configurado
[ ] API rodando em :3001 (health OK)
[ ] Frontend rodando em :5173
[ ] Login funciona (aleff@cav.local)
[ ] Pesquisa retorna resultados
[ ] Perfil do aluno abre
[ ] Relatório de alimentação gera
[ ] Checkout carrega alunos (se Supabase configurado)
[ ] Backup automático configurado
[ ] Outros computadores acessam via IP
```

---

## Credenciais

### Search/Secretaria (API Local)

| Usuário | E-mail | Perfil |
|---------|--------|--------|
| Aleff | aleff@cav.local | admin |
| Patrícia | patricia@cav.local | admin |
| Gisele | gisele@cav.local | secretaria |
| Sirley | sirley@cav.local | secretaria |

Senhas entregues pessoalmente. Para resetar:

```bash
node server/scripts/change-password.js <email> <nova-senha>
```

### Checkout (Supabase)

| Usuário | E-mail | Perfil |
|---------|--------|--------|
| Recepção | recepcao@cav.com | reception |
| Coord. Infantil | infantil@cav.com | infantil_coordination |
| Coord. Fundamental | fundamental@cav.com | fundamental_coordination |
| Suporte | suporte@cav.com | support |

---

## Estrutura de Arquivos no Servidor

```
~/veritus/
├── veritus-community/          # Código fonte (git clone)
│   ├── server/                 # API backend
│   │   ├── index.js            # Servidor API
│   │   ├── migrations/         # Schema SQL
│   │   └── scripts/            # Backup, import, senha
│   ├── src/                    # Frontend React
│   ├── .env.local              # Configuração local (NÃO no git)
│   └── package.json
└── backups/
    └── db/                     # Backups diários (.sql.gz)
```

---

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| "Connection refused" no API | Verifique se `npm run api` está rodando |
| "Não foi possível entrar" | Verifique e-mail e senha. API precisa estar rodando. |
| PostgreSQL não conecta | Verifique se o serviço está rodando: `pg_isready` (Mac) ou Services (Windows) |
| Página não carrega | Verifique se `npm run dev -- --host` está rodando |
| Outros PCs não acessam | Verifique IP e se estão na mesma rede WiFi |
| Backup falhou | Verifique se PostgreSQL está rodando e o diretório existe |
| "Permission denied" (Windows) | Execute PowerShell como Administrador |

---

## Manutenção

### Atualizar o sistema:

```bash
cd ~/veritus/veritus-community
git pull origin main
npm install
# Reinicie API e frontend
```

### Verificar saúde do banco:

```bash
psql veritus_os -c "SELECT count(*) FROM students WHERE active = true;"
```

### Verificar backups:

```bash
ls -lh ~/veritus/backups/db/*.sql.gz | tail -5
```
