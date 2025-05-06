# TaskPRO - Aplicativo de Gerenciamento de Tarefas

TaskPRO é um aplicativo de gerenciamento de tarefas que permite aos usuários organizar suas tarefas por período (dia, semana, mês, ano) e acompanhar seu status. Agora com suporte para armazenamento em nuvem usando o Supabase.

## Configuração do Supabase

Para utilizar o TaskPRO com o Supabase, siga os passos abaixo:

### 1. Crie uma conta no Supabase

- Acesse [supabase.com](https://supabase.com/)
- Clique em "Start your project" e crie uma conta
- Crie um novo projeto no Supabase

### 2. Crie a tabela de tarefas

No painel de controle do Supabase:

1. Vá para a seção "Table Editor" ou "SQL Editor"
2. Execute o seguinte código SQL para criar a tabela de tarefas:

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    category TEXT NOT NULL,
    startdate TIMESTAMP WITH TIME ZONE NOT NULL,
    enddate TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicione políticas de acesso à tabela (opcional, se quiser implementar autenticação futuramente)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public tasks access" ON tasks FOR SELECT USING (true);
CREATE POLICY "Public tasks insert" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public tasks update" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Public tasks delete" ON tasks FOR DELETE USING (true);
```

### 3. Configure a aplicação

1. Abra o arquivo `supabase-config.js` na raiz do projeto
2. Substitua as variáveis `SUPABASE_URL` e `SUPABASE_KEY` pelos valores reais do seu projeto:

```javascript
const SUPABASE_URL = 'SUA_URL_DO_SUPABASE'; // Substitua pela URL do seu projeto
const SUPABASE_KEY = 'SUA_CHAVE_ANON_DO_SUPABASE'; // Substitua pela chave anônima do seu projeto
```

Você pode encontrar esses valores no painel do Supabase em:
- Configurações do projeto > API > URL e anon/public

### 4. Execute a aplicação

Após fazer essas configurações, a aplicação TaskPRO estará conectada ao Supabase e todas as tarefas serão sincronizadas com o banco de dados em nuvem.

## Funcionalidades

- Adição, exclusão e atualização de tarefas
- Categorização por período (dia, semana, mês, ano)
- Controle de status (Em andamento, Concluído, Finalizado, Em atraso)
- Fixação de tarefas importantes
- Pesquisa de tarefas
- Sincronização com o Supabase (armazenamento em nuvem)
- Fallback para armazenamento local quando offline

## Tecnologias

- HTML5, CSS3, JavaScript
- Supabase para armazenamento em nuvem

## Considerações sobre Deployment

Para servir a aplicação em um ambiente de produção:

1. É recomendado configurar variáveis de ambiente para as chaves do Supabase
2. Considere implementar autenticação de usuários para proteger os dados
3. Configure CORS adequadamente no Supabase para permitir requisições do seu domínio 