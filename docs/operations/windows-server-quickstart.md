# VeritusOS — Windows Server Quickstart (1 página)

Checklist prático para instalar **Busca/Secretaria + Saída de Alunos** no
computador-servidor (Windows) do Colégio Alta Vista. Detalhes completos em
[`physical-server-setup.md`](./physical-server-setup.md).

> Substitua os placeholders: `<SERVER_IP>`, `<POSTGRES_PASSWORD>`, `<DB_NAME>` (use `veritus_os`),
> `<GITHUB_REPO_URL>`. **Nunca** coloque senhas reais neste arquivo.

Pré-requisitos (instalar uma vez): **Git**, **Node.js 20 LTS**, **PostgreSQL 17**.

---

## Passos (na ordem)

```powershell
# 1) Clonar o repositório
cd C:\
git clone <GITHUB_REPO_URL> C:\veritus\veritus-community
cd C:\veritus\veritus-community

# 2) Instalar dependências + build + pm2  (Prompt como Administrador)
scripts\win\install.bat

# 3) Criar o arquivo .env.local (ANTES do build já feito no passo 2 — se editar depois, rode 'npm run build' de novo)
#    Conteúdo mínimo (modo local, sem Supabase):
#      VITE_CHECKOUT_LOCAL_MODE=true
#      VITE_LOCAL_API_URL=http://<SERVER_IP>:3333
notepad .env.local

# 4) Criar/restaurar o banco PostgreSQL
#    a) Criar vazio:
createdb -U postgres <DB_NAME>          # informe <POSTGRES_PASSWORD> quando pedir
#    b) OU restaurar de um backup (traz os ~385 alunos prontos):
#       Expand-Archive C:\veritus\backups\db\<DB_NAME>_AAAAMMDD_HHMMSS.sql.zip -DestinationPath $env:TEMP\vr -Force
#       & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d <DB_NAME> -f $env:TEMP\vr\<arquivo>.sql

# 5) Rodar as migrations (só se criou banco vazio no 4a)
set PGPASSWORD=<POSTGRES_PASSWORD>
psql -U postgres -d <DB_NAME> -f server\migrations\001_schema.sql
psql -U postgres -d <DB_NAME> -f server\migrations\002_saved_queries.sql
psql -U postgres -d <DB_NAME> -f server\migrations\003_checkout_schema.sql

# 6) Ajustar o IP estático no ecosystem (abrir e editar SERVER_IP = '<SERVER_IP>')
notepad ecosystem.config.cjs

# 7) Abrir as portas no firewall (Prompt como Administrador)
scripts\win\open-firewall.bat

# 8) Iniciar os serviços
scripts\win\start-veritus.bat
scripts\win\status.bat                  # os 3 devem aparecer "online"

# 9) Criar atalhos na área de trabalho
powershell -ExecutionPolicy Bypass -File scripts\win\create-shortcuts.ps1 -ServerIp <SERVER_IP>

# 10) Trocar as senhas iniciais dos usuários de checkout
node server\scripts\change-password.js recepcao@cav.local <nova-senha>
node server\scripts\change-password.js infantil@cav.local <nova-senha>
node server\scripts\change-password.js fundamental@cav.local <nova-senha>
```

### 11) Autostart (Agendador de Tarefas)
- PostgreSQL: `services.msc` → `postgresql-x64-17` → Inicialização **Automático**.
- Criar Tarefa → "Ao iniciar o computador", "Executar mesmo sem login", "Privilégios mais altos"
  → Programa: `C:\veritus\veritus-community\scripts\win\start-veritus.bat` (Iniciar em: a pasta do repo).

### 12) Tarefa de backup diário (Agendador)
- Criar Tarefa Básica → Diariamente **22:00** → Programa `powershell.exe`
  → Argumentos: `-ExecutionPolicy Bypass -File C:\veritus\veritus-community\server\scripts\backup-all.ps1`

### 13) Teste de reboot
- Reiniciar o servidor → após ligar, `scripts\win\status.bat` deve mostrar os 3 `online`.

### 14) Teste da página de status
- Abrir o atalho **"VeritusOS — Status do Sistema"** (`http://<SERVER_IP>:3333/api/system/health`)
  → **tudo verde**.

### 15) Teste das URLs da equipe (de OUTRO computador na mesma rede)
- `http://<SERVER_IP>:5173/checkout` → login recepção/coordenação → 1 fluxo de saída completo.
- `http://<SERVER_IP>:5173/search` → login secretaria → 1 busca → 1 relatório de refeição.

---

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| **Página não abre** (de outro PC) | Servidor desligado, rede diferente, ou firewall | Confirme servidor ligado e na mesma rede; rode `open-firewall.bat` (Admin); teste `http://<SERVER_IP>:3333/api/system/health`. |
| **Página não abre** (no próprio servidor) | Serviço não subiu | `scripts\win\status.bat`; se faltar algum, `scripts\win\start-veritus.bat`. |
| **Login falha** | Senha errada / usuário inativo | Resetar senha: `node server\scripts\change-password.js <email> <nova-senha>` (preserva papel/módulo/ativo). |
| **API offline** (status vermelho :3001/:3333) | Processo caiu | `scripts\win\restart-veritus.bat`; ver causa em `scripts\win\status.bat logs` ou `logs\*.log`. |
| **Frontend offline** (:5173 vermelho) | Build ausente ou processo caiu | `npm run build` e depois `restart-veritus.bat`. |
| **Banco offline** (PostgreSQL vermelho) | Serviço do Postgres parado | `services.msc` → iniciar `postgresql-x64-17`; confirme que está em **Automático**. |
| **Backup faltando** (vermelho) | Tarefa não rodou / pasta errada | Rodar manual: `powershell -ExecutionPolicy Bypass -File server\scripts\backup-all.ps1`; conferir a Tarefa do passo 12 e a pasta `C:\veritus\backups\db`. |
| **Porta já em uso** (`EADDRINUSE`) | Outra cópia rodando nessa porta | `netstat -ano | findstr :3333` → achar o PID → `taskkill /PID <pid> /F`; ou `pm2 delete all` e `start-veritus.bat`. |
| **Firewall do Windows bloqueando** | Regras ausentes / perfil errado | Rodar `open-firewall.bat` como **Administrador**; garantir que a rede da escola está como **Particular** (não Pública). |

**Healthcheck rápido:** `scripts\win\health-check.bat` (no servidor) ou a página de status.
**Suporte:** Aleff — *(telefone/WhatsApp)*.
