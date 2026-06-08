# Resumo das User Stories (Backoffice OnlyJustCauses)

> Lista numerada conforme pedido: **salta do 3 para o 5** (não existe o número 4).

---

## US01 — Review and approve causes (Admin)

**O que faz:**  
Permite ao admin rever causas antes de serem publicadas, garantindo legitimidade e compliance.

**Critérios de aceitação:**
1. Fila de causas pendentes: mostra todas as causas com status `pending_approval`.
2. Cada causa mostra: **Título, Categoria, Goal, info do criador, Verification status, Creation date, botão Preview**.
3. Ações: **Approve**, **Reject (com reason)**, **Request changes**.
4. Ao aprovar: status passa para **published** e o criador recebe **notificação**.
5. Ao rejeitar: status passa para **rejected** e o criador recebe **email com a reason**.
6. Histórico de aprovação registado por **AccountID** (segurança e AML/auditoria).

---

## US02 — Review KYC submissions (Admin)

**O que faz:**  
Permite ao admin validar identidade (KYC) antes do utilizador poder criar causas.

**Critérios de aceitação:**
1. Existe uma **“KYC Queue”** no admin dashboard.
2. Lista mostra: **User name, Country, Submission date, Status**.
3. Clique abre detalhe com **todos os documentos**.
4. Visualização lado-a-lado: **ID photo vs Selfie**.
5. Checklist: **Photo quality, Name matches, ID not expired, Selfie matches ID, Address proof valid**.
6. Ações: **Approve**, **Reject (com reason)**, **Request resubmission**.
7. Ao aprovar: user fica **Verified**, email enviado, botão **Create Cause** fica ativo.
8. Ao rejeitar: user é notificado com issues específicos e **pode resubmeter**.
9. SLA: aprovação em **48 horas**.

---

## US03 — Platform-wide analytics (Admin)

**O que faz:**  
Permite ao admin acompanhar métricas e saúde da plataforma (crescimento, atividade, receita).

**Critérios de aceitação:**
1. Dashboard com métricas: **Total users, Total causes, Total raised, Active causes, Pending approvals, New users (30 dias), Revenue (7% fee total)**.
2. Gráficos: **Users over time, Donations over time, Revenue over time, Top categories**.
3. Tabelas: **Top causes (por amount raised), Top donors, Top creators**.
4. Filtros: **Date range** e **Category**.
5. Export: **PDF** ou **Excel**.

---

## US05 — Review and approve withdrawal requests (Admin)

**O que faz:**  
Permite ao admin aprovar/rejeitar levantamentos para prevenir fraude e cumprir compliance.

**Critérios de aceitação:**
1. Dashboard mostra todos os withdrawals **pendentes**.
2. Cada withdrawal mostra: **Creator name, Cause, Amount, Bank/Crypto details, Request date**.
3. Ações: **Approve**, **Reject (com reason)**, **Request more info**.
4. Ao aprovar: passa para **Processing**.
5. Plataforma inicia **bank transfer** (Provider Payouts API) ou **crypto transfer**.
6. Ao rejeitar: criador é notificado e fundos retornam ao **wallet balance**.
7. Processing time: **3–5 business days** (bank), **1–2 hours** (crypto).
8. Transação registada no **withdrawal history**.
9. Email enviado ao criador em cada mudança de status.

---

## US06 — Review reported causes (Admin)

**O que faz:**  
Permite gerir denúncias de causas e aplicar ações (fraude/conteúdo impróprio/etc.).

**Critérios de aceitação:**
1. Secção **“Reports”** no admin dashboard.
2. Lista: **Cause name, Reporter, Reason, Date, Status (Pending/Reviewed/Resolved)**.
3. Detalhe: **conteúdo da causa, mensagem do reporter, evidência**.
4. Ações: **Approve (cause ok)**, **Remove cause**, **Warn creator**, **Request changes**, **Dismiss report**.
5. Ao remover: causa fica **unpublished** e criador é notificado.
6. Ao avisar: criador recebe warning, causa mantém-se live, **strike** registado.
7. **3 strikes → Account suspended**.
8. Status changes logadas no **audit trail**.

---

## US07 — Manage cause categories (Admin)

**O que faz:**  
Permite gerir categorias disponíveis na criação de causas.

**Critérios de aceitação:**
1. Secção **“Categories”** no admin dashboard.
2. CRUD: **Create, Read, Update, Delete**.
3. Campos: **Name, Icon, Description, Display order, Active/Inactive**.
4. Categorias default: **Health, Education, Community, Animals, Environment, Emergency, Arts, Sports**.
5. Reordenar categorias (drag & drop).
6. Não permite apagar categoria se estiver a ser usada por causas.
7. Alterações refletem imediatamente no form de criação.

---

## US08 — Review edits made to published causes (Admin)

**O que faz:**  
Rever alterações feitas a causas já publicadas, mantendo a versão publicada ativa durante a revisão.

**Critérios de aceitação:**
1. Criador edita causa publicada → status muda para **pending_edit_approval**.
2. Criador recebe notificação: causa mantém-se online, review ~**24h**.
3. Versão publicada fica **ativa** durante revisão.
4. Admin vê: **diff (old vs new), reason do criador, edit timestamp**.
5. Ações: **Approve edit**, **Reject edit (com reason)**.
6. Ao aprovar: status → **published** e versão editada substitui original.
7. Ao rejeitar: status → **published**, mantém original, criador recebe email.
8. Logs: **AccountID + IP + timestamp + fields changed** (auditoria/AML).

---

## US09 — Escalate support tickets to specialized teams (Nice to have)

**O que faz:**  
Escala tickets para equipas/roles específicas com base em regras (valor, fraude, técnico, compliance).

**Critérios de aceitação:**
1. Ticket tem type: **General, High-Value Cause, Fraud Report, Technical, Compliance**.
2. Auto-escalation por regras (exemplos): **> €5,000 → Senior Admin**, **fraud → Compliance**, **technical → Tech Lead**.
3. Fila visível: **Pending, In Progress, Resolved**.
4. Staff original pode anexar **notas e documentos**.
5. Ticket escalado mostra: **original request, assigned to (name/role), reason, deadline**.
6. Assigned staff recebe notificação (**email + in-app**).
7. Pode reatribuir (com audit log).
8. Escalações logadas por **AccountID + timestamp + reason**.

---

## US10 — Immediately block fraudulent causes and protect donors (Admin/Compliance)

**O que faz:**  
Bloqueia imediatamente uma causa suspeita e inicia investigação, protegendo doadores.

**Critérios de aceitação:**
1. Fraud report submetido (ticket ou flag).
2. “Block Cause” → status **blocked_fraud_investigation**.
3. Ao bloquear:
   - causa sai do público
   - fundraising pausa (não aceita novas doações)
   - criador é notificado do bloqueio
   - doadores recebem notificação (“donation under review…”) *(texto/decisão a confirmar)*
4. Escala automaticamente para Compliance Team com ticket.
5. Compliance pode **Keep blocked** ou **Unblock** com approval.
6. Block reason documentada e logada com **AdminID + timestamp**.
7. Bloqueio é **imediato**.
8. Audit trail completo para revisão regulatória.

---

## US11 — Manage incoming emails and respond to users (Support/Admin)

**O que faz:**  
Centraliza emails no backoffice para gestão de comunicação com utilizadores.

**Critérios de aceitação:**
1. Secção **Email Inbox** em `/admin/email`.
2. Emails roteados para inbox partilhada (ex: `support@onlyjustcauses.com` a confirmar).
3. Inbox lista: **From, Subject, Date Received, Status (Unread/Read/Replied/Pending)**.
4. Thread view para conversas.
5. Ler email mostra conteúdo + sender info (**Account ID, User Type**).
6. Reply:
   - editor (plain + basic formatting)
   - anexos até **5MB**
   - CC/BCC
   - drafts
7. Bulk actions: **Mark as read, Delete, Archive, Assign**.
8. Search: **sender name, subject, date range**.
9. Auto-responses/templates (nice to have).
10. Emails/replies logados com **responder ID + timestamp + content hash**.
11. Attachments: retenção **1 ano** e encriptação (a confirmar com legal).
12. Thread ligado a ticket se aplicável.

---

## US12 — Create admin users and assign roles (Super Admin)

**O que faz:**  
Permite criar e gerir utilizadores admin e atribuir roles, com auditoria.

**Critérios de aceitação:**
1. Super Admin vai a `/admin/team-management`.
2. Criar admin user: **Email, Full Name, Role** (dropdown).
3. Temp password gerada e enviada por email.
4. User muda password no primeiro login.
5. Ver lista: **Name, Email, Role, Status, Created Date, Last Login**.
6. Editar: mudar role, **Deactivate/Reactivate**.
7. Ver atividade: ações + timestamps.
8. Desativar: impedir login, revogar API keys, log event.
9. Reset password: pedido → email enviado.
10. Audit: ações logadas por **ActorID + timestamp**.
11. Só Super Admin pode criar/editar admin users.
12. Temp password expira após primeiro login.

---

## US13 — Search and view detailed user profiles (Admin)

**O que faz:**  
Permite pesquisar utilizadores e ver detalhe/histórico para compliance, com auditoria de acessos.

**Critérios de aceitação:**
1. Search por **Email, Username, Account ID**.
2. Lista: **Username, Email, Account ID, Role (Creator/Donor/Both), KYC Status, Account Created Date**.
3. Detalhe:
   - Account info: username, email, full name, account id, status (Active/Suspended/Banned)
   - KYC info: status, submission date, verification document
4. Se Creator: campaigns criadas (**Title, Status, Goal, Raised, Created Date**) + View/Preview.
5. Se Donor: donations (**Cause, Amount, Date, Status**) + métricas (Count, Sum, Average) *(status a confirmar)*.
6. Activity: **Last Login, Last IP Address**.
7. Acesso logado por **AdminID + timestamp**.
8. Search case-insensitive e real-time.
9. Perfil mostra histórico completo para compliance.

---

## US14 — Define admin roles and configure permissions (Super Admin)

**O que faz:**  
Permite configurar permissões por role (RBAC) e aplicar imediatamente.

**Critérios de aceitação:**
1. Página `/admin/roles-permissions`.
2. Roles predefinidas: Support Staff, Moderator, Compliance Officer, Tech Lead, Senior Admin, Super Admin.
3. Para cada role, enable/disable permissões:
   - View: Users, Causes, Donations, Reports, Email, Audit Logs
   - Action: Approve/Reject/Block Cause, Suspend User, Flag User, Escalate Ticket, Respond Email, View KYC, Export Data
   - Admin: Create/Edit Admin User, View Admin Logs, Configure Roles, Change System Settings
4. Mudanças aplicam imediatamente.
5. Cada role tem descrição visível.
6. Ver role assignments.
7. Audit log de mudanças (nice to have).
8. Super Admin não pode ser restringido.

---

## US15 — Shared backoffice login + app access control (Admin user)

**O que faz:**  
Login único no backoffice e seleção da aplicação (OnlyJustCause), com permissões por role e contexto.

**Critérios de aceitação:**
1. Login em `/backoffice/login` (shared).
2. Email + Password.
3. Após login: lista de apps acessíveis com **App name, Role in that app, Last accessed date**.
4. Clique na app → redireciona para dashboard (ex: `/backoffice/onlyjustcause/panel`).
5. Guarda app selecionada na sessão.
6. Permission check:
   - sem acesso → “Access Denied”
   - sem permissão → feature escondida/desativada (preferência: esconder)
7. Switch Application sem re-auth.
8. Header mostra: app name, user name + role, Switch App, Logout.
9. Logout termina sessão do backoffice inteiro.
10. Audit:
   - login logado (email, IP, timestamp, apps)
   - app access logado (qual app, quando, userID)
   - tentativas de acesso logadas (success/fail)

---