# Phase 3 & 4: Multi-Event ERP & Operational Dashboard

Este plano transforma a PartyOn numa plataforma de padrão industrial, permitindo a gestão de múltiplos eventos, controlo financeiro (gastos/lucros) e uma operação de porta segura e mobile-first.

## 🏗️ Nova Arquitetura Multi-Evento

### Alterações na Base de Dados (Prisma)
- **Status do Evento**: Adição de enum `status` (`DRAFT`, `ACTIVE`, `COMPLETED`, `ARCHIVED`) à tabela `Event`.
- **Gestão Financeira**: Novos campos `expenseName` e `expenseAmount` (ou tabela `Expense`) para cálculo de lucro automático.
- **Relacionamentos**: Garantir que as rotas públicas (loja) procuram apenas o evento com `status: 'ACTIVE'`.

## 🛠️ Módulos do Backoffice

### 1. `/admin/configuration` (Centro de Controlo)
- Mudanças de tema, cores, nomes e imagens.
- **Validação Crítica**: Impedir que o stock seja definido abaixo do número de bilhetes já vendidos.
- **Preview Live**: Ver como o checkout vai aparecer antes de publicar.

### 2. `/admin/dev` (Caixa Negra)
- Visualização de logs do servidor em tempo real.
- **Stripe Debugger**: Lista de webhooks e pagamentos falhados com explicação do erro.

### 3. `/admin/validation` (A Linha da Frente)
- **Mobile-First Design**: Interface otimizada para telemóveis, ambientes escuros e uso rápido.
- **Escaner QR**: Uso da câmara para validação instantânea.
- **Search CRM**: Barra de pesquisa manual (nome/email) para clientes sem bateria ou QR.
- **RBAC**: Permissões limitadas (Staff não pode ver faturamento).

### 4. `/admin/management` (Cérebro do Negócio)
- **Dashboard de Vendas**: Gráficos de receita e volume de check-ins.
- **ERP Financeiro**: Introdução de gastos (DJ, Security, Drinks) para cálculo de lucro líquido.
- **Export**: (Futuro) Exportação de lista de convidados para Excel.

---

## 🚀 Próximos Passos (Para Amanhã)

### 1. Refactor de Dados & Multi-Evento
- [ ] Atualizar `schema.prisma` com `status` e `expenses`.
- [ ] Refatorar `admin.controller.ts` para suportar `createEvent` e `listEvents`.
- [ ] Atualizar `checkout.controller.ts` para usar o ID do evento ativo dinamicamente.

### 2. Layout Modular (Frontend)
- [ ] Criar **Sidebar de Navegação Admin**.
- [ ] Implementar as 4 rotas base.
- [ ] Migrar as funcionalidades atuais para `/configuration`.

### 3. Scanner Mobile-First
- [ ] Implementar o validator QR com foco total em usabilidade móvel.

---

## ❓ Questões Abertas

1. **Autenticação**: Prefere um sistema de login simples (Email/Senha) ou apenas um **Passcode de Admin** para este estágio inicial? 
2. **Staff Access**: Para o `/admin/validation`, podemos gerar um "Link de Staff" único que não exige login, mas que só dá acesso ao scanner. O que acha?
