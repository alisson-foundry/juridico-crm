# Jurídico CRM

Sistema web para gestão de clientes de escritório de advocacia.

## Funcionalidades

- Cadastro e gestão de clientes (CPF/CNPJ, contato, tipo de ação, responsável)
- Timeline de atividades por cliente com status (pendente, em andamento, concluído, cancelado)
- Upload e download de documentos vinculados a atividades
- Controle de usuários com papéis (ADMIN, ADVOGADO, STAFF)
- Notificações internas
- Log de auditoria de todas as alterações
- Interface responsiva com paleta jurídica (navy + gold)

## Credenciais padrão

```
Email: admin@juridico.com
Senha: admin123
```

## Rodando com Docker (recomendado)

```bash
docker-compose up --build
```

Acesse: http://localhost:5173

## Rodando localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL 15+

### Backend

```bash
cd backend
cp .env.example .env
# Edite .env com sua DATABASE_URL
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Stack

| Camada     | Tecnologia                              |
|------------|----------------------------------------|
| Frontend   | React 18 + TypeScript + Vite + Tailwind |
| Backend    | Node.js + Express + TypeScript          |
| ORM        | Prisma                                  |
| Banco      | PostgreSQL                              |
| Auth       | JWT                                     |
| Upload     | Multer                                  |

## Estrutura da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/auth/login | Autenticação |
| GET | /api/auth/me | Usuário logado |
| GET | /api/clients | Listar clientes |
| POST | /api/clients | Criar cliente |
| GET | /api/clients/:id | Detalhes do cliente |
| PUT | /api/clients/:id | Editar cliente |
| DELETE | /api/clients/:id | Excluir cliente |
| GET | /api/clients/:id/activities | Atividades do cliente |
| POST | /api/clients/:id/activities | Nova atividade |
| PUT | /api/activities/:id | Editar atividade |
| DELETE | /api/activities/:id | Excluir atividade |
| POST | /api/activities/:id/files | Upload de arquivo |
| GET | /api/files/:id/download | Download de arquivo |
| GET | /api/users | Listar usuários (ADMIN) |
| POST | /api/users | Criar usuário (ADMIN) |
| GET | /api/notifications | Notificações do usuário |
