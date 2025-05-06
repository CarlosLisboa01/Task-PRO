// Configuração do Supabase
// Certifique-se de que a URL não inclui '/rest/v1' porque a biblioteca Supabase adiciona esse caminho automaticamente
const SUPABASE_URL = 'https://oqjhdbvzjtvqznmnbsvk.supabase.co'; // Substitua pela sua URL do Supabase
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamhkYnZ6anR2cXpubW5ic3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTI0MzgsImV4cCI6MjA2MjEyODQzOH0.R8MiHOQRSS4B0d7kjEZbNECiTCE0ecaRBop7my-dhWQ'; // Substitua pela sua chave anônima do Supabase

// Inicializar o cliente Supabase
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);

// Função para buscar todas as tarefas do usuário
async function fetchTasks() {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('pinned', { ascending: false });
        
        if (error) throw error;
        
        // Organizar as tarefas por categoria
        const organizedTasks = {
            day: [],
            week: [],
            month: [],
            year: []
        };
        
        // Converter de snake_case para camelCase para uso na aplicação
        data.forEach(task => {
            const formattedTask = {
                id: task.id,
                text: task.text,
                category: task.category,
                startDate: task.startdate,
                endDate: task.enddate,
                status: task.status,
                pinned: task.pinned,
                createdAt: task.created_at
            };
            
            if (organizedTasks[formattedTask.category]) {
                organizedTasks[formattedTask.category].push(formattedTask);
            }
        });
        
        return organizedTasks;
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
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
        console.log('Tentando conectar ao Supabase em:', SUPABASE_URL);
        const { data, error } = await supabase.from('tasks').select('count', { count: 'exact' }).limit(1);
        if (error) {
            console.error('Erro ao conectar ao Supabase:', error);
            throw error;
        }
        console.log('Conexão com Supabase bem-sucedida');
        return true;
    } catch (error) {
        console.error('Erro na conexão com o Supabase:', error);
        return false;
    }
} 