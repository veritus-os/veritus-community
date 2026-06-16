# Servidor Físico — Colégio Alta Vista (Search + Checkout local)

Guia para colocar **Busca/Secretaria** e **Saída de Alunos (Checkout)** rodando
no computador-servidor da escola, em rede local (LAN), **sem depender do Supabase**
para a operação diária.

## Arquitetura

```
                 Computador-servidor (LAN da escola)
   ┌─────────────────────────────────────────────────────────┐
   │  PostgreSQL  ──  banco único  veritus_os                 │
   │     public.*    students, guardians, student_guardians,  │  (dados COMPARTILHADOS)
   │                 families, meal_subscriptions, staff_users │
   │     checkout.*  checkout_daily, checkout_logs, v_board    │  (estado da saída)
   │     public.*    + saved_queries, search_history (Busca)   │
   │                                                           │
   │  Node API Busca      :3001   (server/index.js)            │
   │  Node API Checkout   :3333   (scripts/checkout-pg-server) │
   │  Frontend (Vite)     :5173   → /search  e  /checkout      │
   └─────────────────────────────────────────────────────────┘
        ▲ LAN                ▲ LAN                ▲ LAN
   Recepção            Coordenação           Secretaria
   (navegador)          (navegador)          (navegador)
```

Dispositivos acessam pelo **IP do servidor** (ex.: `http://192.168.0.10:5173/checkout`).
O Supabase permanece **opcional** (modo de referência/teste) — não é usado na operação diária.

---

## 1. Software necessário

| Software | Versão | Observação |
|---|---|---|
| Git | qualquer recente | clonar o repositório |
| Node.js | 20 LTS | roda as APIs e o frontend |
| PostgreSQL | 16 ou 17 | banco de dados local |
| pm2 (opcional) | `npm i -g pm2` | manter serviços de pé + autostart |

### Instalação
- **Windows:** baixe os instaladores oficiais — [git-scm.com](https://git-scm.com), [nodejs.org](https://nodejs.org) (LTS), [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) (anote a senha do usuário `postgres`).
- **Mac:** `brew install git node postgresql@17 && brew services start postgresql@17`
- **Linux (Ubuntu/Debian):** `sudo apt install git nodejs npm postgresql && sudo systemctl enable --now postgresql`

---

## 2. Clonar o repositório

```bash
cd ~        # ou C:\veritus  no Windows
git clone <URL_DO_REPO> veritus-community
cd veritus-community
npm install
```

---

## 3. Banco de dados

### 3a. Criar o banco e aplicar o schema
```bash
createdb veritus_os                                   # (Windows: use o pgAdmin ou 'psql -U postgres')
psql veritus_os < server/migrations/001_schema.sql
psql veritus_os < server/migrations/002_saved_queries.sql
psql veritus_os < server/migrations/003_checkout_schema.sql   # schema da saída + auth compartilhada
```

### 3b. Importar/restaurar os dados reais (~385 alunos)
Os dados de alunos/responsáveis/turmas são **compartilhados** — a Busca já os mantém.
Use **uma** das opções:

- **Restaurar de um backup** (recomendado — traz tudo pronto):
  ```bash
  gunzip -c <backup>/db/veritus_os_AAAAMMDD_HHMMSS.sql.gz | psql veritus_os
  ```
- **Importar do Supabase** (primeira carga, exige internet uma única vez):
  ```bash
  DATABASE_URL=postgres://localhost:5432/veritus_os \
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
    node server/scripts/import-from-supabase.js
  ```

O Checkout **não importa nada** — ele lê os mesmos alunos da Busca pela view `checkout.v_board`.

### 3c. Usuários de acesso
- **Busca/Secretaria:** já existem (aleff, patricia, gisele, sirley, ju).
- **Checkout:** recepcao@ / infantil@ / fundamental@ / suporte@cav.local — criados pela migração `003`.
  Senha inicial: `MudarSenha@2026` → **trocar no primeiro dia** (veja seção 9).

---

## 4. Configurar variáveis de ambiente

Crie `.env.local` (frontend) apontando para as APIs locais — **sem Supabase**:
```ini
# Frontend
VITE_CHECKOUT_LOCAL_MODE=true
VITE_LOCAL_API_URL=http://SEU_IP_DO_SERVIDOR:3333   # ex.: http://192.168.0.10:3333
# (deixe em branco para usar automaticamente o mesmo host:3333 do navegador)
```
APIs (variáveis de processo, ver seção 6):
```ini
DATABASE_URL=postgres://localhost:5432/veritus_os
CORS_ORIGINS=http://192.168.0.10:5173      # IP do servidor : porta do frontend
```

---

## 5. Descobrir o IP do servidor / IP estático

- **Windows:** `ipconfig` → "Endereço IPv4".
- **Mac:** `ipconfig getifaddr en0`  •  **Linux:** `hostname -I`

> **Recomende IP estático.** No roteador, reserve o IP do servidor pelo MAC (DHCP reservation),
> ou configure IP fixo no servidor (ex.: `192.168.0.10`). Assim o endereço nunca muda e os
> atalhos dos dispositivos continuam válidos.

---

## 6. Subir os serviços (Windows — pm2)

> **OS deste servidor: Windows.** Usamos **pm2** para gerenciar os 3 serviços
> (reinício automático, logs, status). Os scripts ficam em `scripts\win\`.
> Edite o IP estático em `ecosystem.config.cjs` (`SERVER_IP`) antes do primeiro start.

```bat
REM Instalação única (Prompt de Comando como Administrador):
scripts\win\install.bat        REM npm install + npm run build + instala pm2

REM Operação diária:
scripts\win\start-veritus.bat    REM inicia os 3 serviços + pm2 save
scripts\win\stop-veritus.bat     REM para os 3 serviços
scripts\win\restart-veritus.bat  REM reinicia (após atualizar o código)
scripts\win\status.bat           REM status dos serviços
scripts\win\status.bat logs      REM logs ao vivo (Ctrl+C para sair)
```

| Ação | Comando pm2 equivalente |
|---|---|
| Iniciar | `pm2 start ecosystem.config.cjs` |
| Parar | `pm2 stop ecosystem.config.cjs` |
| Reiniciar | `pm2 restart ecosystem.config.cjs` |
| Status | `pm2 status` |
| Logs | `pm2 logs` (ou `pm2 logs veritus-checkout`) |
| Persistir p/ boot | `pm2 save` |

Os 3 processos: **veritus-search** (:3001), **veritus-checkout** (:3333), **veritus-web** (:5173).
Logs em `logs\*.log`.

---

## 7. Acesso pelos computadores da equipe

No navegador de cada dispositivo (mesma rede Wi-Fi/cabo):
- **Saída de alunos:** `http://IP_DO_SERVIDOR:5173/checkout`
- **Busca/Secretaria:** `http://IP_DO_SERVIDOR:5173/search`
- **Status do sistema:** `http://IP_DO_SERVIDOR:3333/api/system/health` (página verde/vermelho, sem dados de alunos)

**Criar os atalhos automaticamente** (na área de trabalho de todos os usuários):
```powershell
powershell -ExecutionPolicy Bypass -File scripts\win\create-shortcuts.ps1 -ServerIp 192.168.0.10
```
(Sem `-ServerIp`, ele lê o `SERVER_IP` do `ecosystem.config.cjs`.) Os hostnames `out.*` / `ache.*`
continuam válidos se houver DNS local; pelo IP, `/checkout` e `/search` funcionam direto.

### Firewall
Libere as portas **5173, 3001, 3333** na rede local:
- **Windows:** Firewall do Windows → Regras de Entrada → Nova Regra → Porta → TCP `5173,3001,3333` → Permitir (perfil **Particular**).
- **Mac:** Ajustes → Rede → Firewall → permitir conexões para `node`.
- **Linux:** `sudo ufw allow from 192.168.0.0/24 to any port 5173,3001,3333 proto tcp`

---

## 8. Autostart (ligar sozinho quando o computador liga) — Windows

**Método escolhido: pm2 + Agendador de Tarefas (Task Scheduler).** O Agendador inicia o
`start-veritus.bat` no boot; o pm2 sobe e mantém os 3 serviços de pé.

1. Garanta que o **PostgreSQL** inicia no boot: `services.msc` → "postgresql-x64-17" →
   Tipo de inicialização = **Automático**.
2. **Agendador de Tarefas** → *Criar Tarefa…* (não "Tarefa Básica"):
   - **Geral:** marque **"Executar estando o usuário conectado ou não"** e **"Executar com privilégios mais altos"**.
   - **Disparadores:** Novo → *Ao iniciar o computador* → (opcional) atraso de 30s para o Postgres subir antes.
   - **Ações:** Novo → *Iniciar um programa* →
     - Programa: `C:\veritus\veritus-community\scripts\win\start-veritus.bat`
     - Iniciar em: `C:\veritus\veritus-community`
   - **Condições:** desmarque "Iniciar a tarefa somente se o computador estiver na energia CA".
3. Teste sem reiniciar: botão direito na tarefa → **Executar** → `scripts\win\status.bat`
   deve listar os 3 processos `online`.

> Para rodar **sem ninguém logado** com gerenciamento de serviço mais robusto, alternativa:
> `npm i -g pm2-installer` (instala o pm2 como Serviço do Windows). O método acima já cobre
> o caso típico (servidor com login automático).

---

## 9. Operação diária

- **Trocar senhas iniciais:** `node server/scripts/change-password.js recepcao@cav.local <nova-senha>` (idem para os demais).
- **Reset diário da saída:** acontece automaticamente por data (cada dia começa com todos `at_school`).
  Reset manual (apenas admin/secretaria) pelo botão na tela, ou ele zera sozinho na virada do dia.
  **Os logs são preservados** — o reset não apaga histórico.
- **Healthcheck:** `http://IP:3333/api/health` e `http://IP:3001/api/health`.

---

## 10. Backup (Windows — PowerShell)

Script nativo do Windows (não precisa de Git-Bash): `server\scripts\backup-all.ps1`
(faz `pg_dump` + zipa o banco, salva config/`.jwt-secret`/`.env*`, retenção de 30 dias).

```powershell
REM Teste manual:
powershell -ExecutionPolicy Bypass -File server\scripts\backup-all.ps1
```

**Agendar diariamente (22:00)** — Agendador de Tarefas → *Criar Tarefa Básica*:
- Disparador: **Diariamente 22:00**
- Ação: *Iniciar um programa*
  - Programa: `powershell.exe`
  - Argumentos: `-ExecutionPolicy Bypass -File C:\veritus\veritus-community\server\scripts\backup-all.ps1`

Backups em `C:\veritus\backups\db\` e `...\config\`. **Guarde uma cópia fora do servidor**
(pendrive/HD/nuvem) toda semana.

**Restore (teste mensal):**
```powershell
Expand-Archive C:\veritus\backups\db\veritus_os_AAAAMMDD_HHMMSS.sql.zip -DestinationPath $env:TEMP\vrestore -Force
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -d veritus_os -f $env:TEMP\vrestore\veritus_os_AAAAMMDD_HHMMSS.sql
```

> Em Mac/Linux, o equivalente é `bash server/scripts/backup-all.sh` (mesma lógica).

### Restore antigo (referência bash)
```bash
gunzip -c ~/veritus-backups/db/veritus_os_AAAAMMDD_HHMMSS.sql.gz | psql veritus_os
```
Guarde **uma cópia fora do servidor** (pendrive/HD externo/nuvem) periodicamente.

---

## 11. Reiniciar após queda de energia

1. O computador liga → PostgreSQL sobe (serviço) → pm2/Task Scheduler sobe as 3 partes.
2. Conferir: abrir `http://IP:3333/api/health` (deve responder `{"status":"ok","db":"up"}`).
3. **O estado da saída do dia é preservado** (fica no Postgres, não na memória).
4. Se algo não subiu: rodar `scripts\win\start-veritus.bat` (ou `pm2 resurrect`).

### ✅ Verificação rápida após reboot (1 minuto)
- [ ] `scripts\win\status.bat` → os 3 processos `online`.
- [ ] Abrir o atalho **"VeritusOS — Status do Sistema"** (ou `http://IP:3333/api/system/health`) → **tudo verde**.
- [ ] Abrir o atalho **Saída de Alunos** e fazer login (recepção).
- [ ] Abrir o atalho **Secretaria** e fazer login.
- [ ] Confirmar que a **tarefa de backup** existe no Agendador de Tarefas.

> Atalho de verificação por terminal: `scripts\win\health-check.bat` (abre a página de status no navegador).

---

## 12. Checklist de virada (go-live) — fazer uma vez

- [ ] PostgreSQL em **Automático** (`services.msc`) e DB `veritus_os` com dados reais.
- [ ] `ecosystem.config.cjs` com o **IP estático** correto em `SERVER_IP`.
- [ ] **`.env.local` configurado ANTES do build** (`VITE_CHECKOUT_LOCAL_MODE=true`; seção 4) — o Vite "assa" o env no build.
- [ ] `scripts\win\install.bat` rodado (deps + build + pm2).
- [ ] `scripts\win\open-firewall.bat` rodado **como Administrador** (portas 5173/3001/3333).
- [ ] IP estático/reserva DHCP configurado no roteador.
- [ ] Tarefa de autostart criada (seção 8) e testada com *Executar*.
- [ ] Tarefa de backup diário criada (seção 10).
- [ ] **Senhas dos 4 usuários de checkout trocadas** (`change-password.js`).
- [ ] **Reiniciar o servidor** e confirmar que os 3 serviços sobem sozinhos (`status.bat`).
- [ ] De **outro computador**: abrir `/checkout` e `/search`.
- [ ] Login checkout (recepção + coordenação) e **1 fluxo completo** de saída.
- [ ] Login secretaria, **1 busca** e **1 relatório de refeição**.
- [ ] Rodar backup manual e **testar 1 restore**.
- [ ] Cartão de acesso (`staff-access-card.md`) impresso com o IP real.

---

## Modo Supabase (referência/opcional)
Para voltar ao modo nuvem temporariamente, use um `.env.local` com `VITE_SUPABASE_URL`/`ANON_KEY`
e sem `VITE_CHECKOUT_LOCAL_MODE`. **Não é necessário para a operação diária** e não deve ser
o modo de produção da escola.
