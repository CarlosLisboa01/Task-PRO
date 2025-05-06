# TaskPRO - Aplicativo de Gerenciamento de Tarefas

TaskPRO é um aplicativo de gerenciamento de tarefas que permite aos usuários organizar suas tarefas por período (dia, semana, mês, ano) e acompanhar seu status. Agora com suporte para armazenamento em nuvem usando o Supabase e sistema de comentários para cada tarefa.

## Configuração do Supabase

Para utilizar o TaskPRO com o Supabase, siga os passos abaixo:

### 1. Crie uma conta no Supabase

- Acesse [supabase.com](https://supabase.com/)
- Clique em "Start your project" e crie uma conta
- Crie um novo projeto no Supabase

### 2. Crie as tabelas no banco de dados

No painel de controle do Supabase:

1. Vá para a seção "Table Editor" ou "SQL Editor"
2. Execute o seguinte código SQL para criar as tabelas necessárias:

```sql
-- Criar a tabela principal de tarefas
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

-- Adicionar políticas de acesso público para a tabela
-- Isso permite que qualquer usuário possa acessar os dados sem autenticação
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public tasks access" ON tasks FOR SELECT USING (true);
CREATE POLICY "Public tasks insert" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public tasks update" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Public tasks delete" ON tasks FOR DELETE USING (true);

-- Adicionar índices para melhorar a performance das consultas
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_pinned ON tasks(pinned);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Criar tabela para os comentários das tarefas
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar políticas de acesso público para a tabela de comentários
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public task_comments access" ON task_comments FOR SELECT USING (true);
CREATE POLICY "Public task_comments insert" ON task_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public task_comments update" ON task_comments FOR UPDATE USING (true);
CREATE POLICY "Public task_comments delete" ON task_comments FOR DELETE USING (true);

-- Adicionar índice para melhorar performance
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
```

### 3. Configure a aplicação

1. Abra o arquivo `supabase-config.js` na raiz do projeto
2. Substitua as variáveis `SUPABASE_URL` e `SUPABASE_KEY` pelos valores reais do seu projeto:

```javascript
const SUPABASE_URL = 'https://seu-projeto.supabase.co'; // Substitua pela URL do seu projeto
const SUPABASE_KEY = 'sua-chave-anon'; // Substitua pela chave anônima do seu projeto
```

Você pode encontrar esses valores no painel do Supabase em:
- Configurações do projeto > API > URL e anon/public

### 4. Execute a aplicação

Após fazer essas configurações, a aplicação TaskPRO estará conectada ao Supabase e todas as tarefas e comentários serão sincronizados com o banco de dados em nuvem.

## Funcionalidades

- Adição, exclusão e atualização de tarefas
- Categorização por período (dia, semana, mês, ano)
- Controle de status (Em andamento, Concluído, Finalizado, Em atraso)
- Fixação de tarefas importantes
- Pesquisa de tarefas
- Sistema de comentários para cada tarefa
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