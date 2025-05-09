// Configuração do Supabase
// A URL do Supabase deve incluir o protocolo correto e a região
const SUPABASE_URL = 'https://oqjhdbvzjtvqznmnbsvk.supabase.co'; // URL principal do projeto 
const SUPABASE_API_URL = 'https://oqjhdbvzjtvqznmnbsvk.supabase.co/rest/v1'; // URL da API REST
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamhkYnZ6anR2cXpubW5ic3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTI0MzgsImV4cCI6MjA2MjEyODQzOH0.R8MiHOQRSS4B0d7kjEZbNECiTCE0ecaRBop7my-dhWQ'; 

// Verificar se as constantes foram definidas corretamente
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERRO CRÍTICO: URL ou chave do Supabase não definidas corretamente!');
}

// Inicializar o cliente Supabase
let supabase;
try {
    supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Cliente Supabase inicializado com sucesso');
} catch (error) {
    console.error('Erro ao inicializar cliente Supabase:', error);
    // Criar um cliente fictício para não quebrar a aplicação
    supabase = {
        from: () => ({
            select: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            insert: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            update: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            delete: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            eq: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }) }),
            order: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }) }),
            limit: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }) })
        })
    };
}

// Verificação de conectividade inicial
console.log('Supabase inicializado com: URL:', SUPABASE_URL);
console.log('API REST URL:', SUPABASE_API_URL);
console.log('Chave API presente:', SUPABASE_KEY ? 'Sim' : 'Não');

// Função com fallback para fazer requisições diretas via fetch caso o cliente Supabase falhe
async function directFetch(endpoint, options = {}) {
    try {
        const url = `${SUPABASE_API_URL}/${endpoint}`;
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        console.log(`Tentando requisição direta para: ${url}`);
        
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erro na requisição direta (${response.status}): ${errorText}`);
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Resposta da requisição direta:', data);
        return { data, error: null };
    } catch (error) {
        console.error('Erro na requisição direta:', error);
        return { data: null, error };
    }
}

// Função para buscar todas as tarefas do usuário com fallback
async function fetchTasks() {
    try {
        console.log('Iniciando fetchTasks() - Tentando buscar todas as tarefas...');
        
        // Tentar usar o cliente Supabase primeiro
        let result;
        try {
            result = await supabase
                .from('tasks')
                .select('*')
                .order('pinned', { ascending: false });
                
            if (result.error) {
                console.error('Erro ao buscar tarefas via cliente Supabase:', result.error);
                throw result.error;
            }
        } catch (supabaseError) {
            console.warn('Falha no cliente Supabase, tentando requisição direta...');
            // Tentar requisição direta como fallback
            result = await directFetch('tasks?order=pinned.desc');
            
            if (result.error) {
                console.error('Erro também na requisição direta:', result.error);
                throw result.error;
            }
        }
        
        const data = result.data;
        console.log('Tarefas recebidas:', data ? data.length : 0, 'itens');
        
        // Organizar as tarefas por categoria
        const organizedTasks = {
            day: [],
            week: [],
            month: [],
            year: []
        };
        
        // Converter de snake_case para camelCase para uso na aplicação
        if (data && data.length > 0) {
            data.forEach(task => {
                const formattedTask = {
                    id: task.id,
                    text: task.text || 'Sem título',
                    category: task.category || 'day',
                    startDate: task.startdate || new Date().toISOString(),
                    endDate: task.enddate || new Date().toISOString(),
                    status: task.status || 'pending',
                    pinned: task.pinned || false,
                    createdAt: task.created_at || new Date().toISOString()
                };
                
                // Garantir que a categoria seja válida
                if (!organizedTasks[formattedTask.category]) {
                    console.warn('Categoria desconhecida na tarefa, mudando para "day":', formattedTask);
                    formattedTask.category = 'day';
                }
                
                organizedTasks[formattedTask.category].push(formattedTask);
            });
        } else {
            console.warn('Nenhuma tarefa encontrada no servidor');
        }
        
        // Contar tarefas por categoria
        Object.keys(organizedTasks).forEach(category => {
            console.log(`Categoria ${category}: ${organizedTasks[category].length} tarefas`);
        });
        
        return organizedTasks;
    } catch (error) {
        console.error('Exceção em fetchTasks():', error);
        console.error('Stack trace:', error.stack);
        
        // Retornar objeto vazio em caso de erro
        return {
            day: [],
            week: [],
            month: [],
            year: []
        };
    }
}

// Função para adicionar uma nova tarefa
async function addTask(task) {
    try {
        // Criar uma cópia do objeto para evitar modificar o original e converter para snake_case
        const taskToSave = { 
            text: task.text,
            category: task.category,
            startdate: task.startDate, // Convertido para minúsculas para PostgreSQL
            enddate: task.endDate,     // Convertido para minúsculas para PostgreSQL
            status: task.status,
            pinned: task.pinned || false,
            created_at: task.createdAt || new Date().toISOString() // Convertido para snake_case
        };
        
        console.log('Enviando para o Supabase (formato ajustado):', taskToSave);
        
        // Tentar uma versão mais simples para depuração
        const { data, error } = await supabase
            .from('tasks')
            .insert([taskToSave]);
        
        if (error) {
            console.error('Erro detalhado do Supabase:', error);
            console.error('Código:', error.code);
            console.error('Mensagem:', error.message);
            console.error('Detalhes:', error.details);
            throw error;
        }
        
        // Se a inserção foi bem-sucedida mas não retornou dados, buscar a tarefa recém-criada
        if (!data || data.length === 0) {
            // Buscar a tarefa mais recentemente criada que corresponda aos nossos critérios
            const { data: fetchedData, error: fetchError } = await supabase
                .from('tasks')
                .select('*')
                .eq('text', taskToSave.text)
                .order('created_at', { ascending: false })
                .limit(1);
                
            if (fetchError) {
                console.error('Erro ao buscar tarefa após inserção:', fetchError);
            } else if (fetchedData && fetchedData.length > 0) {
                // Converter de volta para o formato camelCase usado na aplicação
                const taskData = fetchedData[0];
                return {
                    id: taskData.id,
                    text: taskData.text,
                    category: taskData.category,
                    startDate: taskData.startdate, // Converter de volta para camelCase
                    endDate: taskData.enddate,     // Converter de volta para camelCase
                    status: taskData.status,
                    pinned: taskData.pinned,
                    createdAt: taskData.created_at // Converter de volta para camelCase
                };
            }
            
            // Se não conseguir recuperar a tarefa, retornar a original com um ID fictício
            return { 
                ...task, 
                id: Date.now() 
            };
        }
        
        // Converter o resultado de volta para o formato camelCase usado na aplicação
        const resultTask = data[0];
        return {
            id: resultTask.id,
            text: resultTask.text,
            category: resultTask.category,
            startDate: resultTask.startdate, // Converter de volta para camelCase
            endDate: resultTask.enddate,     // Converter de volta para camelCase
            status: resultTask.status,
            pinned: resultTask.pinned,
            createdAt: resultTask.created_at // Converter de volta para camelCase
        };
    } catch (error) {
        console.error('Erro ao adicionar tarefa:', error);
        return null;
    }
}

// Função para atualizar uma tarefa existente
async function updateTask(taskId, updates) {
    try {
        // Converter as chaves de camelCase para snake_case para o PostgreSQL
        const updatesToSave = {};
        
        if (updates.hasOwnProperty('text')) updatesToSave.text = updates.text;
        if (updates.hasOwnProperty('category')) updatesToSave.category = updates.category;
        if (updates.hasOwnProperty('startDate')) updatesToSave.startdate = updates.startDate;
        if (updates.hasOwnProperty('endDate')) updatesToSave.enddate = updates.endDate;
        if (updates.hasOwnProperty('status')) updatesToSave.status = updates.status;
        if (updates.hasOwnProperty('pinned')) updatesToSave.pinned = updates.pinned;
        if (updates.hasOwnProperty('createdAt')) updatesToSave.created_at = updates.createdAt;
        
        console.log('Atualizando no Supabase (formato ajustado):', updatesToSave);
        
        const { data, error } = await supabase
            .from('tasks')
            .update(updatesToSave)
            .eq('id', taskId)
            .select();
        
        if (error) {
            console.error('Erro ao atualizar tarefa:', error);
            throw error;
        }
        
        if (!data || data.length === 0) return null;
        
        // Converter de volta para camelCase
        const resultTask = data[0];
        return {
            id: resultTask.id,
            text: resultTask.text,
            category: resultTask.category,
            startDate: resultTask.startdate,
            endDate: resultTask.enddate,
            status: resultTask.status,
            pinned: resultTask.pinned,
            createdAt: resultTask.created_at
        };
    } catch (error) {
        console.error('Erro ao atualizar tarefa:', error);
        return null;
    }
}

// Função para excluir uma tarefa
async function deleteTask(taskId) {
    try {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        return false;
    }
}

// Função para verificar o status da conexão com o Supabase
async function checkSupabaseConnection() {
    try {
        console.log('Verificando conexão com Supabase em:', SUPABASE_URL);
        
        // Testar conectividade básica
        try {
            // Primeiro tentar com o cliente Supabase
            const startTime = Date.now();
            const { data, error } = await supabase.from('tasks').select('count', { count: 'exact' }).limit(1);
            const endTime = Date.now();
            
            if (error) {
                console.error('Erro na conexão Supabase via cliente:', error);
                throw error;
            }
            
            console.log(`Conexão com Supabase bem-sucedida em ${endTime - startTime}ms`);
            return true;
        } catch (clientError) {
            console.warn('Falha no cliente Supabase, tentando requisição direta...', clientError);
            
            // Tentar requisição direta como fallback
            try {
                const startTime = Date.now();
                const result = await directFetch('tasks?limit=1');
                const endTime = Date.now();
                
                if (result.error) {
                    console.error('Erro também na requisição direta:', result.error);
                    throw result.error;
                }
                
                console.log(`Conexão direta com Supabase bem-sucedida em ${endTime - startTime}ms`);
                return true;
            } catch (fetchError) {
                console.error('Todas as tentativas de conexão falharam');
                throw fetchError;
            }
        }
    } catch (error) {
        console.error('Erro final na verificação de conexão:', error);
        return false;
    }
}

// Função para buscar comentários de uma tarefa
async function fetchTaskComments(taskId) {
    try {
        const { data, error } = await supabase
            .from('task_comments')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Erro ao buscar comentários:', error);
            throw error;
        }
        
        // Converter para o formato da aplicação (camelCase)
        return data.map(comment => ({
            id: comment.id,
            taskId: comment.task_id,
            text: comment.text,
            createdAt: comment.created_at
        }));
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        return [];
    }
}

// Função para adicionar um comentário a uma tarefa
async function addTaskComment(taskId, text) {
    try {
        const commentToSave = {
            task_id: taskId,
            text: text,
        };
        
        const { data, error } = await supabase
            .from('task_comments')
            .insert([commentToSave])
            .select();
        
        if (error) {
            console.error('Erro ao adicionar comentário:', error);
            throw error;
        }
        
        if (!data || data.length === 0) return null;
        
        // Converter para o formato da aplicação (camelCase)
        const comment = data[0];
        return {
            id: comment.id,
            taskId: comment.task_id,
            text: comment.text,
            createdAt: comment.created_at
        };
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        return null;
    }
}

// Função para excluir um comentário
async function deleteTaskComment(commentId) {
    try {
        const { error } = await supabase
            .from('task_comments')
            .delete()
            .eq('id', commentId);
        
        if (error) {
            console.error('Erro ao excluir comentário:', error);
            throw error;
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao excluir comentário:', error);
        return false;
    }
} 