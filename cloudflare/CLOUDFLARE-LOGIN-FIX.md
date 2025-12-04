# Correção do Login no Cloudflare

## Problema Identificado

O login não funcionava no Cloudflare Workers porque:

1. **Conflito de versões do drizzle-orm**: O projeto principal e a pasta cloudflare tinham versões diferentes do drizzle-orm, causando incompatibilidade de tipos
2. **Importação de schema incorreta**: Os arquivos de rotas importavam do `shared/schema.ts` que usava a versão do drizzle-orm do projeto principal

## Correções Aplicadas

### 1. Schema Local para Cloudflare
Criado `cloudflare/worker/schema.ts` com uma cópia do schema que usa a versão do drizzle-orm instalada na pasta cloudflare.

### 2. Importações Atualizadas
Todos os arquivos de rotas em `cloudflare/worker/routes/` foram atualizados para importar do schema local:
- auth.ts
- files.ts
- folders.ts
- admin.ts
- shares.ts
- invitations.ts
- upgrades.ts
- system.ts
- shared-content.ts
- public-folders.ts

### 3. Melhorias na Autenticação
- Adicionado logging detalhado para diagnóstico de erros
- Usada versão síncrona do bcrypt para compatibilidade (`bcrypt.compareSync`)

## Configuração Necessária no Cloudflare

### Variáveis de Ambiente (Secrets)
No painel do Cloudflare Workers, certifique-se de que as seguintes variáveis estão configuradas como **Secrets** (não Plaintext):

```bash
# Conexão com o banco de dados (DEVE incluir sslmode=require)
wrangler secret put DATABASE_URL
# Cole: postgresql://postgres.qbysugdrbxqdvrnhqodk:SUA_SENHA@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require

# Chave JWT (deve ser a mesma usada no Replit)
wrangler secret put JWT_SECRET
# Cole uma chave segura com pelo menos 32 caracteres
```

### Importante: DATABASE_URL
A URL do banco de dados **DEVE** incluir `?sslmode=require` no final para funcionar com Supabase/Neon:
```
postgresql://...@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### Importante: JWT_SECRET
Se você quiser que os tokens JWT gerados no Replit funcionem no Cloudflare e vice-versa, use o **mesmo** JWT_SECRET em ambos os ambientes.

## Deploy

Após fazer as correções, faça o deploy:

```bash
cd cloudflare
npm run deploy
```

Ou pelo GitHub Actions (se configurado).

## Verificação de Logs

Para verificar logs de erros no Cloudflare:

```bash
wrangler tail
```

Os logs agora mostram:
- `Login attempt for: email@example.com` - Início da tentativa de login
- `User found, verifying password. Hash type: $2b$...` - Usuário encontrado, tipo de hash
- `Password verified, creating token` - Senha verificada com sucesso
- `Login successful for: email@example.com` - Login completo

## Troubleshooting

### Erro 401 (Email ou senha incorretos)
- Verifique se o email existe no banco de dados
- Verifique se a senha está correta
- Use `wrangler tail` para ver os logs detalhados

### Erro 500 (Erro ao fazer login)
- Verifique a DATABASE_URL (deve ter `?sslmode=require`)
- Verifique se o JWT_SECRET está configurado
- Use `wrangler tail` para ver o erro específico

### Senhas Bcrypt vs PBKDF2
- Usuários criados no Replit usam bcrypt (começa com `$2a$` ou `$2b$`)
- Usuários criados no Cloudflare usam PBKDF2 (começa com `pbkdf2:`)
- Ambos os formatos são suportados
