# 🖥️ VeritusOS — Cartão de Acesso (Colégio Alta Vista)

> Imprima e cole nos computadores da equipe. Os **3 atalhos** abaixo são criados
> automaticamente na área de trabalho (veja "Atalhos" no fim). Troque
> `IP_DO_SERVIDOR` pelo IP real do servidor (ex.: `192.168.0.10`).
> Todos os dispositivos devem estar na **mesma rede** da escola.

---

## 🟦 Atalhos da área de trabalho

| Atalho | O que faz | Quem usa |
|---|---|---|
| **VeritusOS — Saída de Alunos** | Painel de saída/portaria (responsável chegou → liberação → saída) | Recepção e Coordenação |
| **VeritusOS — Secretaria** | Busca de alunos, perfis, matrícula, relatórios de refeição | Secretaria e Administração |
| **VeritusOS — Status do Sistema** | Mostra se tudo está no ar (verde = OK) | Aleff / suporte (verificação rápida) |

---

## 📤 Saída de Alunos (Recepção / Coordenação)

**Endereço:** `http://IP_DO_SERVIDOR:5173/checkout`

| Função | Usuário | Senha |
|---|---|---|
| Recepção | `recepcao@cav.local` | *(definida pelo Aleff)* |
| Coordenação Infantil | `infantil@cav.local` | *(definida pelo Aleff)* |
| Coordenação Fundamental | `fundamental@cav.local` | *(definida pelo Aleff)* |

**Fluxo:** Recepção marca *Responsável chegou* → Coordenação *Libera da sala* → Recepção *Confirma saída*.

---

## 🔎 Secretaria / Busca

**Endereço:** `http://IP_DO_SERVIDOR:5173/search`

| Função | Usuário |
|---|---|
| Secretaria | `gisele@cav.local` · `sirley@cav.local` |
| Administração | `patricia@cav.local` · `aleff@cav.local` |

Recursos: busca de alunos, perfis, matrícula, relatórios de refeição, buscas salvas.

---

## ❓ Se o sistema não abrir

1. **Confirme que o computador-servidor está ligado** e conectado à rede da escola.
2. Verifique se o seu computador está na **mesma rede** (Wi-Fi/cabo da escola).
3. Abra o atalho **"VeritusOS — Status do Sistema"** (`http://IP_DO_SERVIDOR:3333/api/system/health`):
   - **Tudo verde** → tente recarregar a página (Ctrl+F5).
   - **Algo em vermelho (FALHA)** → avise o suporte e informe o que está vermelho.
4. A página de status não abre? O servidor pode estar desligado/reiniciando — aguarde 2 min e tente de novo.

### 📞 Suporte
- **Aleff** — *(anotar telefone/WhatsApp aqui)*
- Esqueceu a senha? Fale com o Aleff (não há autoatendimento).

---

## 🛠️ Atalhos (criados pelo Aleff, uma vez)
No servidor: `powershell -ExecutionPolicy Bypass -File scripts\win\create-shortcuts.ps1 -ServerIp IP_DO_SERVIDOR`
→ cria os 3 atalhos na área de trabalho de todos os usuários.
