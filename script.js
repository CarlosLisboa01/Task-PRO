// Seleção dos elementos do DOM
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskCategory = document.getElementById('task-category');
const taskStartDate = document.getElementById('task-start-date');
const taskEndDate = document.getElementById('task-end-date');
const newTaskBtn = document.getElementById('new-task-btn');
const taskFormModal = document.getElementById('task-form-modal');
const closeModalBtn = document.querySelector('.close-modal');
const cancelBtn = document.querySelector('.btn-cancel');
const themeToggle = document.querySelector('.theme-toggle');
const searchInput = document.querySelector('.header-search input');

// Seleção dos elementos relacionados aos comentários
const commentsModal = document.getElementById('comments-modal');
const closeCommentsBtn = document.querySelector('.close-comments-modal');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const commentInput = document.getElementById('comment-input');
const commentTaskId = document.getElementById('comment-task-id');

// Configuração inicial
document.body.classList.add(localStorage.getItem('theme') || 'light');
const now = new Date();
const nowString = now.toISOString().slice(0, 16);

// Estado global das tarefas - será preenchido pelo Supabase ou localStorage
window.tasks = {
    day: [],
    week: [],
    month: [],
    year: []
};

// Estado global para os comentários das tarefas
let taskComments = {};

// Definir a função filterTasksByStatus no escopo global
window.filterTasksByStatus = function(status) {
    console.log("Filtrando por status (global):", status);
    
    // Assegurar que estamos na página correta
    if (window.location.hash !== '#dashboard' && window.location.hash !== '') {
        window.location.hash = '#dashboard';
        // Usar setTimeout para garantir que a navegação seja concluída
        setTimeout(() => {
            performFilterByStatus(status);
        }, 500);
    } else {
        performFilterByStatus(status);
    }
};

// Função real que realiza a filtragem
function performFilterByStatus(status) {
    console.log("Executando filtro para status:", status);
    
    if (!window.tasks) {
        console.error("Objeto 'tasks' não encontrado!");
        return;
    }
    
    // Contador para saber quantas tarefas foram filtradas
    let visibleTasksCount = 0;
    let totalTasksCount = 0;
    
    Object.keys(window.tasks).forEach(category => {
        const taskList = document.querySelector(`#${category} .task-list`);
        if (!taskList) {
            console.log(`Lista de tarefas não encontrada para categoria: ${category}`);
            return;
        }
        
        const taskItems = taskList.querySelectorAll('.task-item');
        console.log(`Encontradas ${taskItems.length} tarefas na categoria ${category}`);
        totalTasksCount += taskItems.length;
        
        taskItems.forEach(item => {
            if (status === 'all') {
                item.style.display = '';
                visibleTasksCount++;
            } else {
                const isMatching = item.classList.contains(`status-${status}`);
                item.style.display = isMatching ? '' : 'none';
                
                if (isMatching) {
                    visibleTasksCount++;
                }
            }
        });
        
        // Verificar se a lista ficou vazia após o filtro
        const visibleItems = Array.from(taskItems).filter(item => item.style.display !== 'none');
        if (visibleItems.length === 0) {
            // Se não houver itens visíveis, mostrar uma mensagem
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message filtered-empty';
            emptyMessage.innerHTML = `
                <i class="fas fa-filter"></i>
                <p>Nenhuma tarefa com status "${getStatusText(status)}" nesta categoria</p>
            `;
            
            // Remover mensagens anteriores
            const oldMessage = taskList.querySelector('.filtered-empty');
            if (oldMessage) oldMessage.remove();
            
            taskList.appendChild(emptyMessage);
        } else {
            // Remover mensagens de filtro vazio se existirem
            const oldMessage = taskList.querySelector('.filtered-empty');
            if (oldMessage) oldMessage.remove();
        }
    });
    
    console.log(`Filtro aplicado: ${visibleTasksCount} de ${totalTasksCount} tarefas visíveis`);
    
    // Atualizar visualmente qual filtro está selecionado
    const radioButton = document.querySelector(`.status-option input[value="${status}"]`);
    if (radioButton) {
        radioButton.checked = true;
    }
    
    // Mostrar notificação sobre a filtragem
    const statusTexts = {
        'all': 'Todas as tarefas',
        'pending': 'Tarefas em andamento',
        'completed': 'Tarefas concluídas',
        'finished': 'Tarefas finalizadas', 
        'late': 'Tarefas atrasadas'
    };
    
    if (typeof showSuccessNotification === 'function') {
        showSuccessNotification(`Filtrando: ${statusTexts[status] || status} (${visibleTasksCount} tarefas)`);
    }
}

// Carregar tarefas do Supabase quando a página for carregada
document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar estado de carregamento
    showLoadingState();
    
    try {
        // Verificar conexão com Supabase
        const isConnected = await checkSupabaseConnection();
        
        if (!isConnected) {
            // Se não conseguir conectar ao Supabase, usar o localStorage como fallback
            const storedTasks = localStorage.getItem('tasks');
            if (storedTasks) {
                window.tasks = JSON.parse(storedTasks);
                console.log('Tarefas carregadas do localStorage:', window.tasks);
            } else {
                console.warn('Nenhuma tarefa encontrada no localStorage');
                window.tasks = {
                    day: [],
                    week: [],
                    month: [],
                    year: []
                };
            }
            
            showErrorNotification('Não foi possível conectar ao Supabase. Usando armazenamento local.');
        } else {
            // Buscar tarefas do Supabase
            const fetchedTasks = await fetchTasks();
            window.tasks = fetchedTasks;
            
            // Guardar uma cópia no localStorage para garantir
            localStorage.setItem('tasks', JSON.stringify(window.tasks));
            console.log('Tarefas carregadas do Supabase e salvas no localStorage:', window.tasks);
        }
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        
        // Fallback para localStorage em caso de erro
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            window.tasks = JSON.parse(storedTasks);
            console.log('Tarefas carregadas do localStorage (após erro):', window.tasks);
        } else {
            console.warn('Nenhuma tarefa encontrada no localStorage após erro');
            window.tasks = {
                day: [],
                week: [],
                month: [],
                year: []
            };
        }
        
        showErrorNotification('Erro ao carregar tarefas. Usando armazenamento local.');
    } finally {
        // Ocultar estado de carregamento e renderizar tarefas
        hideLoadingState();
        renderTasks();
        
        // Configurar todos os botões de Nova Tarefa na aplicação
        setupAllTaskButtons();
        
        // Configurar a navegação entre as páginas
        setupNavigation();
        
        // Assegura que os gráficos sejam atualizados na inicialização
        if (window.location.hash === '#analises' && typeof updateAnalytics === 'function') {
            updateAnalytics();
        }
    }
});

// Função para configurar todos os botões de Nova Tarefa
function setupAllTaskButtons() {
    // Configurar botão do dashboard
    const dashboardNewTaskBtn = document.getElementById('new-task-btn');
    if (dashboardNewTaskBtn) {
        dashboardNewTaskBtn.removeEventListener('click', prepareNewTask);
        dashboardNewTaskBtn.addEventListener('click', function(e) {
            e.preventDefault();
            prepareNewTask();
        });
    }
    
    // Configurar botão do calendário
    const calendarNewTaskBtn = document.getElementById('new-task-btn-calendar');
    if (calendarNewTaskBtn) {
        calendarNewTaskBtn.removeEventListener('click', prepareNewTask);
        calendarNewTaskBtn.addEventListener('click', function(e) {
            e.preventDefault();
            prepareNewTask();
        });
    }
    
    // Usar delegação de eventos para garantir que novos botões também funcionem
    document.removeEventListener('click', handleTaskButtonClick);
    document.addEventListener('click', handleTaskButtonClick);
}

// Handler para o clique nos botões de Nova Tarefa
function handleTaskButtonClick(e) {
    const target = e.target;
    
    // Verificar se o clique foi em algum botão de nova tarefa
    const newTaskButton = 
        target.closest('#new-task-btn') || 
        target.closest('#new-task-btn-calendar');
    
    if (newTaskButton) {
        console.log('Botão de nova tarefa clicado:', newTaskButton.id);
        e.preventDefault();
        e.stopPropagation();
        prepareNewTask();
    }
}

// Função para mostrar estado de carregamento
function showLoadingState() {
    // Adicionar um overlay de carregamento a cada coluna de tarefas
    document.querySelectorAll('.task-list').forEach(list => {
        list.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando tarefas...</p>
            </div>
        `;
    });
}

// Função para ocultar estado de carregamento
function hideLoadingState() {
    document.querySelectorAll('.loading-state').forEach(loading => {
        loading.remove();
    });
}

// Função para limpar restrições de data
function clearDateRestrictions() {
    // Remover restrições dos inputs de data
    taskStartDate.removeAttribute('min');
    taskStartDate.removeAttribute('max');
    taskEndDate.removeAttribute('min');
    taskEndDate.removeAttribute('max');
}

// Limpar restrições ao carregar a página
clearDateRestrictions();

// Controle do modal
function openModal() {
    console.log("Abrindo modal...");
    taskFormModal.style.display = 'flex';
    taskInput.focus();
    document.body.style.overflow = 'hidden';
    clearDateRestrictions();
}

function closeModal() {
    console.log("Fechando modal...");
    taskFormModal.style.display = 'none';
    taskForm.reset();
    document.body.style.overflow = '';
}

// Garantir que o modal comece fechado
taskFormModal.style.display = 'none';

// Ajuste para o fluxo de adição de tarefa - limpar todos os dados
function prepareNewTask() {
    console.log("Preparando nova tarefa...");
    
    // Verificar se o modal existe
    if (!taskFormModal) {
        console.error("Modal não encontrado!");
        return;
    }
    
    // Limpar o formulário
    taskForm.reset();
    
    // Limpar restrições de data
    clearDateRestrictions();
    
    // Definir status padrão como pendente
    document.querySelector('input[name="status"][value="pending"]').checked = true;
    
    // Abrir o modal
    openModal();
}

// Restaurar os event listeners para fechar o modal
closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

// Fechar modal ao clicar fora
taskFormModal.addEventListener('click', (e) => {
    if (e.target === taskFormModal) closeModal();
});

// Toggle do tema
themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark-theme' : 'light');
    themeToggle.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
});

// Eventos para campos de data
taskStartDate.addEventListener('click', clearDateRestrictions);
taskEndDate.addEventListener('click', clearDateRestrictions);

// Remover o validationMessage
taskStartDate.addEventListener('invalid', (e) => {
    e.preventDefault();
    clearDateRestrictions();
});

taskEndDate.addEventListener('invalid', (e) => {
    e.preventDefault();
    clearDateRestrictions();
});

// Evento ao mudar a data inicial - não definir min para data final
taskStartDate.addEventListener('change', () => {
    // Não definimos restrições, apenas validamos no submit
    clearDateRestrictions();
});

// Função para validar datas antes de submeter
function validateDates(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return end > start;
}

// Função para formatar data e hora
function formatDateTime(dateString) {
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('pt-BR', options);
}

// Função para obter ícone do status
function getStatusIcon(status) {
    const icons = {
        pending: '<i class="fas fa-clock"></i>',
        completed: '<i class="fas fa-check"></i>',
        finished: '<i class="fas fa-flag-checkered"></i>',
        late: '<i class="fas fa-exclamation-triangle"></i>'
    };
    return icons[status] || icons.pending;
}

// Função para obter texto do status
function getStatusText(status) {
    const texts = {
        pending: 'Em andamento',
        completed: 'Concluído',
        finished: 'Finalizado',
        late: 'Em atraso'
    };
    return texts[status] || texts.pending;
}

// Função atualizada para salvar tarefas no Supabase E localStorage como fallback
async function saveTasks() {
    try {
        // Verificar se as tarefas estão inicializadas
        if (!window.tasks) {
            console.error('Erro: window.tasks não está inicializado');
            return false;
        }
        
        // Sempre salvar no localStorage como fallback
        localStorage.setItem('tasks', JSON.stringify(window.tasks));
        console.log('Tarefas salvas no localStorage');
        
        // Atualizar contadores visuais
        updateTaskCounts();
        
        // Atualizar a página de análises, se estiver inicializada
        if (typeof updateAnalytics === 'function') {
            console.log('Atualizando análises após salvar tarefas');
            updateAnalytics();
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar tarefas:', error);
        showErrorNotification('Erro ao salvar tarefas');
        return false;
    }
}

// Função para atualizar contadores de tarefas
function updateTaskCounts() {
    // Verificar se window.tasks está inicializado
    if (!window.tasks) {
        console.error('window.tasks não está inicializado');
        return;
    }
    
    Object.keys(window.tasks).forEach(category => {
        const count = window.tasks[category].length;
        const countElement = document.querySelector(`#${category} .task-count`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Função para verificar se uma tarefa está atrasada
function isTaskLate(task) {
    const now = new Date();
    const endDate = new Date(task.endDate);
    return now > endDate;
}

// Função para verificar se uma tarefa está em andamento
function isTaskInProgress(task) {
    const now = new Date();
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    return now >= startDate && now <= endDate;
}

// Função para atualizar status de tarefas
async function updateTasksStatus() {
    let updated = false;
    let updatedTasks = [];
    
    Object.keys(tasks).forEach(category => {
        tasks[category].forEach(task => {
            if (task.status !== 'completed' && task.status !== 'finished') {
                const wasLate = task.status === 'late';
                const isLate = isTaskLate(task);
                const inProgress = isTaskInProgress(task);
                
                let newStatus = task.status;
                
                if (isLate && !wasLate) {
                    newStatus = 'late';
                    updated = true;
                } else if (inProgress && task.status !== 'pending') {
                    newStatus = 'pending';
                    updated = true;
                }
                
                if (newStatus !== task.status) {
                    task.status = newStatus;
                    updatedTasks.push({
                        id: task.id,
                        status: newStatus
                    });
                }
            }
        });
    });
    
    if (updated) {
        // Atualizar no localStorage
        saveTasks();
        
        // Atualizar no Supabase (em paralelo)
        try {
            updatedTasks.forEach(async task => {
                await updateTask(task.id, { status: task.status });
            });
        } catch (error) {
            console.error('Erro ao atualizar status das tarefas no Supabase:', error);
            showErrorNotification('Erro ao atualizar status das tarefas no servidor');
        }
        
        renderTasks();
    }
}

// Função para filtrar tarefas
function filterTasks(searchTerm) {
    const term = searchTerm.toLowerCase();
    Object.keys(tasks).forEach(category => {
        const taskList = document.querySelector(`#${category} .task-list`);
        const taskItems = taskList.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            const text = item.querySelector('.task-content').textContent.toLowerCase();
            item.style.display = text.includes(term) ? '' : 'none';
        });
    });
}

// Função para criar elemento de tarefa
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item status-${task.status}`;
    taskElement.dataset.id = task.id; // Armazenar o ID para operações CRUD
    
    // Adicionar classe de tarefa fixada, se aplicável
    if (task.pinned) {
        taskElement.classList.add('pinned');
    }
    
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    
    const taskDates = document.createElement('div');
    taskDates.className = 'task-dates';
    taskDates.innerHTML = `
        <span><i class="fas fa-hourglass-start"></i> ${formatDateTime(task.startDate)}</span>
        <span><i class="fas fa-hourglass-end"></i> ${formatDateTime(task.endDate)}</span>
    `;
    
    const taskText = document.createElement('div');
    taskText.textContent = task.text;
    
    taskContent.appendChild(taskDates);
    taskContent.appendChild(taskText);
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';
    
    const statusSelect = document.createElement('select');
    statusSelect.className = `status-${task.status}`;
    
    statusSelect.innerHTML = Object.entries({
        pending: 'Em andamento',
        completed: 'Concluído',
        finished: 'Finalizado',
        late: 'Em atraso'
    }).map(([value, text]) => `
        <option value="${value}" ${task.status === value ? 'selected' : ''}>
            ${text}
        </option>
    `).join('');
    
    // Botão de comentários
    const commentsButton = document.createElement('button');
    commentsButton.className = 'comments-button';
    commentsButton.innerHTML = '<i class="fas fa-comments"></i>';
    commentsButton.title = 'Ver comentários';
    
    // Contador de comentários (será atualizado quando os comentários forem carregados)
    const commentsCount = document.createElement('span');
    commentsCount.className = 'comments-count';
    commentsCount.style.display = 'none'; // Inicialmente oculto
    commentsButton.appendChild(commentsCount);
    
    // Evento para abrir modal de comentários
    commentsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openCommentsModal(task.id);
    });
    
    // Botão de fixar
    const pinButton = document.createElement('button');
    pinButton.className = 'pin-button';
    pinButton.innerHTML = task.pinned 
        ? '<i class="fas fa-thumbtack pinned" title="Desafixar"></i>' 
        : '<i class="fas fa-thumbtack" title="Fixar"></i>';
    pinButton.title = task.pinned ? 'Desafixar' : 'Fixar';
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteButton.title = 'Excluir tarefa';
    
    actionsDiv.appendChild(statusSelect);
    actionsDiv.appendChild(commentsButton);
    actionsDiv.appendChild(pinButton);
    actionsDiv.appendChild(deleteButton);
    
    taskElement.appendChild(taskContent);
    taskElement.appendChild(actionsDiv);
    
    // Adicionar animação de entrada
    taskElement.style.opacity = '0';
    taskElement.style.transform = 'translateY(20px)';
    setTimeout(() => {
        taskElement.style.opacity = '1';
        taskElement.style.transform = 'translateY(0)';
    }, 50);
    
    // Carregar contagem de comentários (assíncrono)
    loadCommentsCount(task.id);
    
    return { taskElement, statusSelect, pinButton, deleteButton, commentsButton, commentsCount };
}

// Função para renderizar tarefas
function renderTasks() {
    // Verificar se window.tasks está inicializado
    if (!window.tasks) {
        console.error('window.tasks não está inicializado ao renderizar tarefas');
        
        // Tentar restaurar do localStorage
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            try {
                window.tasks = JSON.parse(storedTasks);
                console.log('Tarefas restauradas do localStorage durante renderização');
            } catch (e) {
                console.error('Erro ao parsear tarefas do localStorage:', e);
                window.tasks = {
                    day: [],
                    week: [],
                    month: [],
                    year: []
                };
            }
        } else {
            window.tasks = {
                day: [],
                week: [],
                month: [],
                year: []
            };
        }
    }
    
    Object.keys(window.tasks).forEach(category => {
        const taskList = document.querySelector(`#${category} .task-list`);
        if (!taskList) {
            console.warn(`Lista de tarefas não encontrada para categoria: ${category}`);
            return;
        }
        
        taskList.innerHTML = '';
        
        if (window.tasks[category].length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.innerHTML = `
                <i class="fas fa-inbox"></i>
                <p>Nenhuma tarefa ainda</p>
            `;
            taskList.appendChild(emptyMessage);
            return;
        }
        
        // Ordenar tarefas: primeiro as fixadas, depois as não fixadas
        const sortedTasks = [...window.tasks[category]].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });
        
        sortedTasks.forEach((task) => {
            const { taskElement, statusSelect, pinButton, deleteButton, commentsButton, commentsCount } = createTaskElement(task);
            
            // Evento para atualizar status
            statusSelect.addEventListener('change', async (e) => {
                const newStatus = e.target.value;
                
                // Atualizar no estado local
                const originalIndex = window.tasks[category].findIndex(t => t.id === task.id);
                if (originalIndex !== -1) {
                    window.tasks[category][originalIndex].status = newStatus;
                    
                    // Atualizar classe do elemento da tarefa
                    taskElement.className = `task-item status-${newStatus}`;
                    if (task.pinned) {
                        taskElement.classList.add('pinned');
                    }
                    
                    // Atualizar classe do select
                    statusSelect.className = `status-${newStatus}`;
                    
                    // Salvar no localStorage e atualizar analytics
                    saveTasks();
                    
                    // Salvar no Supabase
                    try {
                        await updateTask(task.id, { status: newStatus });
                    } catch (error) {
                        console.error('Erro ao atualizar status no Supabase:', error);
                        showErrorNotification('Erro ao atualizar status no servidor');
                    }
                }
            });
            
            // Evento para fixar/desafixar tarefa
            pinButton.addEventListener('click', async () => {
                const originalIndex = window.tasks[category].findIndex(t => t.id === task.id);
                if (originalIndex !== -1) {
                    const newPinnedState = !window.tasks[category][originalIndex].pinned;
                    window.tasks[category][originalIndex].pinned = newPinnedState;
                    
                    // Salvar no localStorage e atualizar analytics
                    saveTasks();
                    
                    // Salvar no Supabase
                    try {
                        await updateTask(task.id, { pinned: newPinnedState });
                        renderTasks(); // Re-renderizar para atualizar a ordem
                    } catch (error) {
                        console.error('Erro ao atualizar pin no Supabase:', error);
                        showErrorNotification('Erro ao fixar/desafixar tarefa no servidor');
                    }
                }
            });
            
            // Evento para deletar tarefa
            deleteButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                // Animar a saída da tarefa
                taskElement.style.opacity = '0';
                taskElement.style.transform = 'translateY(20px)';
                
                setTimeout(async () => {
                    const originalIndex = window.tasks[category].findIndex(t => t.id === task.id);
                    if (originalIndex !== -1) {
                        // Remover do estado local
                        window.tasks[category].splice(originalIndex, 1);
                        
                        // Salvar no localStorage e atualizar analytics
                        saveTasks();
                        renderTasks();
                        
                        // Remover do Supabase
                        try {
                            await deleteTask(task.id);
                        } catch (error) {
                            console.error('Erro ao deletar tarefa no Supabase:', error);
                            showErrorNotification('Erro ao excluir tarefa no servidor');
                        }
                    }
                }, 300);
            });
            
            taskList.appendChild(taskElement);
        });
    });
    
    updateTaskCounts();
}

// Pesquisa de tarefas
searchInput.addEventListener('input', (e) => {
    filterTasks(e.target.value);
});

// Evento de submit do formulário
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const text = taskInput.value.trim();
    const category = taskCategory.value;
    const startDate = taskStartDate.value;
    const endDate = taskEndDate.value;
    
    // Verificar se todos os campos estão preenchidos
    if (!text || !startDate || !endDate) {
        showErrorNotification('Todos os campos são obrigatórios');
        return;
    }
    
    const status = document.querySelector('input[name="status"]:checked').value;
    
    if (!validateDates(startDate, endDate)) {
        showErrorNotification('A data/hora final deve ser posterior à data/hora inicial');
        return;
    }
    
    if (text && startDate && endDate) {
        // Formatar as datas para ISO
        const startISO = new Date(startDate).toISOString();
        const endISO = new Date(endDate).toISOString();
        const createdISO = new Date().toISOString();
        
        console.log("Datas formatadas:", {
            startOriginal: startDate,
            startISO,
            endOriginal: endDate,
            endISO
        });
        
        // Criar objeto da tarefa
        const newTask = {
            text,
            category,
            startDate: startISO,
            endDate: endISO,
            status,
            pinned: false,
            createdAt: createdISO
        };
        
        try {
            // Mostrar indicador de carregamento
            showButtonLoading(document.querySelector('.btn-submit'));
            
            console.log("Enviando tarefa:", newTask);
            
            // Adicionar ao Supabase primeiro
            const savedTask = await addTask(newTask);
            
            if (savedTask) {
                // Se bem-sucedido no Supabase, adiciona ao estado local
                tasks[category].push(savedTask);
                saveTasks(); // Salva no localStorage também e atualiza analytics
                renderTasks();
                showSuccessNotification('Tarefa adicionada com sucesso!');
            } else {
                // Se falhar no Supabase, ainda adiciona localmente, mas com aviso
                newTask.id = Date.now(); // Gerar ID temporário
                tasks[category].push(newTask);
                saveTasks(); // Atualiza analytics
                renderTasks();
                showWarningNotification('Tarefa salva localmente, mas não no servidor.');
            }
        } catch (error) {
            console.error('Erro ao adicionar tarefa:', error);
            
            // Adicionar localmente mesmo em caso de erro
            newTask.id = Date.now(); // Gerar ID temporário
            tasks[category].push(newTask);
            saveTasks();
            renderTasks();
            showErrorNotification('Erro ao salvar no servidor. Tarefa salva apenas localmente.');
        } finally {
            // Esconder indicador de carregamento
            hideButtonLoading(document.querySelector('.btn-submit'));
        }
    }
});

// Função para mostrar indicador de carregamento em botão
function showButtonLoading(button) {
    const originalContent = button.innerHTML;
    button.dataset.originalContent = originalContent;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    button.disabled = true;
}

// Função para esconder indicador de carregamento em botão
function hideButtonLoading(button) {
    if (button.dataset.originalContent) {
        button.innerHTML = button.dataset.originalContent;
        button.disabled = false;
    }
}

// Verificar status das tarefas periodicamente
setInterval(updateTasksStatus, 1000 * 60); // Atualiza a cada minuto

// Adicionar estilos CSS para notificações, tema escuro e indicadores de carregamento
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 24px;
        background-color: var(--surface-color);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.3s ease;
        z-index: 1000;
    }
    
    .notification.success {
        background-color: #dcfce7;
        color: #166534;
    }
    
    .notification.error {
        background-color: #fee2e2;
        color: #b91c1c;
    }
    
    .notification.warning {
        background-color: #fef3c7;
        color: #92400e;
    }
    
    .notification i {
        font-size: 20px;
    }
    
    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--text-secondary);
        gap: 1rem;
    }
    
    .loading-state i {
        font-size: 2rem;
    }
    
    .dark-theme {
        --background-color: #1e293b;
        --surface-color: #334155;
        --text-primary: #f8fafc;
        --text-secondary: #cbd5e1;
        --border-color: #475569;
    }
    
    .dark-theme .task-item {
        background-color: #1e293b;
    }
    
    .dark-theme .header-search,
    .dark-theme .user-profile {
        background-color: #1e293b;
    }
    
    .dark-theme .status-badge {
        background-color: #334155;
    }
`;
document.head.appendChild(style);

// Funções para notificações
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
    
    // Garantir que o modal está fechado
    closeModal();
}

function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function showWarningNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification warning';
    notification.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Funções para manipular o modal de comentários
function openCommentsModal(taskId) {
    commentTaskId.value = taskId;
    commentsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    commentInput.focus();
    
    // Carregar comentários da tarefa
    loadTaskComments(taskId);
}

function closeCommentsModal() {
    commentsModal.style.display = 'none';
    document.body.style.overflow = '';
    commentForm.reset();
}

// Adicionar listeners para o modal de comentários
closeCommentsBtn.addEventListener('click', closeCommentsModal);
commentsModal.addEventListener('click', (e) => {
    if (e.target === commentsModal) closeCommentsModal();
});

// Função para formatar a data dos comentários
function formatCommentTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.round(diffMs / 60000);
    const diffHr = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHr / 24);
    
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin} min atrás`;
    if (diffHr < 24) return `${diffHr} h atrás`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    
    // Se for mais de 7 dias, mostrar a data completa
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Função para criar elemento de comentário
function createCommentElement(comment) {
    const commentElement = document.createElement('div');
    commentElement.className = 'comment-item';
    commentElement.dataset.id = comment.id;
    
    const commentHeader = document.createElement('div');
    commentHeader.className = 'comment-header';
    
    const commentTime = document.createElement('div');
    commentTime.className = 'comment-time';
    commentTime.textContent = formatCommentTime(comment.createdAt);
    
    commentHeader.appendChild(commentTime);
    
    const commentText = document.createElement('div');
    commentText.className = 'comment-text';
    commentText.textContent = comment.text;
    
    const commentActions = document.createElement('div');
    commentActions.className = 'comment-actions';
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-comment-btn';
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteButton.title = 'Excluir comentário';
    
    // Evento para excluir comentário
    deleteButton.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja excluir este comentário?')) {
            try {
                const success = await deleteTaskComment(comment.id);
                
                if (success) {
                    commentElement.style.opacity = '0';
                    commentElement.style.height = '0';
                    setTimeout(() => {
                        commentElement.remove();
                        
                        // Remover do estado local
                        const taskId = commentTaskId.value;
                        if (taskComments[taskId]) {
                            taskComments[taskId] = taskComments[taskId].filter(c => c.id !== comment.id);
                            
                            // Atualizar contador de comentários no botão
                            updateCommentsCount(taskId);
                        }
                    }, 300);
                }
            } catch (error) {
                console.error('Erro ao excluir comentário:', error);
                showErrorNotification('Erro ao excluir comentário');
            }
        }
    });
    
    commentActions.appendChild(deleteButton);
    
    commentElement.appendChild(commentHeader);
    commentElement.appendChild(commentText);
    commentElement.appendChild(commentActions);
    
    return commentElement;
}

// Função para carregar comentários de uma tarefa
async function loadTaskComments(taskId) {
    showCommentLoading();
    
    try {
        // Se já temos os comentários no cache, usar eles
        if (taskComments[taskId]) {
            renderComments(taskComments[taskId]);
        }
        
        // Buscar comentários atualizados do servidor
        const comments = await fetchTaskComments(taskId);
        
        // Atualizar cache e renderizar
        taskComments[taskId] = comments;
        renderComments(comments);
        
        // Atualizar contador de comentários no botão
        updateCommentsCount(taskId);
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        showErrorNotification('Erro ao carregar comentários');
    } finally {
        hideCommentLoading();
    }
}

// Função para mostrar estado de carregamento de comentários
function showCommentLoading() {
    commentsList.innerHTML = `
        <div class="comment-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Carregando comentários...</p>
        </div>
    `;
}

// Função para ocultar estado de carregamento de comentários
function hideCommentLoading() {
    const loading = commentsList.querySelector('.comment-loading');
    if (loading) {
        loading.remove();
    }
}

// Função para renderizar comentários
function renderComments(comments) {
    commentsList.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = `
            <div class="empty-comments">
                <i class="fas fa-comments"></i>
                <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
            </div>
        `;
        return;
    }
    
    comments.forEach(comment => {
        const commentElement = createCommentElement(comment);
        commentsList.appendChild(commentElement);
    });
    
    // Rolar para o comentário mais recente
    commentsList.scrollTop = commentsList.scrollHeight;
}

// Função para adicionar comentário
commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const text = commentInput.value.trim();
    const taskId = commentTaskId.value;
    
    if (!text) return;
    
    try {
        // Mostrar indicador de carregamento
        showButtonLoading(document.querySelector('.comment-submit-btn'));
        
        // Adicionar comentário ao Supabase
        const comment = await addTaskComment(taskId, text);
        
        if (comment) {
            // Adicionar ao estado local
            if (!taskComments[taskId]) {
                taskComments[taskId] = [];
            }
            
            taskComments[taskId].push(comment);
            
            // Renderizar comentários
            renderComments(taskComments[taskId]);
            
            // Atualizar contador de comentários no botão
            updateCommentsCount(taskId);
            
            // Limpar formulário
            commentForm.reset();
            commentInput.focus();
        } else {
            showErrorNotification('Erro ao adicionar comentário');
        }
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        showErrorNotification('Erro ao adicionar comentário');
    } finally {
        // Esconder indicador de carregamento
        hideButtonLoading(document.querySelector('.comment-submit-btn'));
    }
});

// Função para carregar e exibir a contagem de comentários
async function loadCommentsCount(taskId) {
    try {
        // Se ainda não temos os comentários dessa tarefa, carregá-los
        if (!taskComments[taskId]) {
            const comments = await fetchTaskComments(taskId);
            taskComments[taskId] = comments;
        }
        
        // Atualizar contador de comentários
        updateCommentsCount(taskId);
    } catch (error) {
        console.error('Erro ao carregar contagem de comentários:', error);
    }
}

// Função para atualizar contador de comentários
function updateCommentsCount(taskId) {
    const commentsCount = taskComments[taskId]?.length || 0;
    
    // Atualizar contador no botão da tarefa atual
    document.querySelectorAll(`.task-item[data-id="${taskId}"] .comments-count`).forEach(countElement => {
        if (commentsCount > 0) {
            countElement.textContent = commentsCount > 99 ? '99+' : commentsCount;
            countElement.style.display = 'flex';
        } else {
            countElement.style.display = 'none';
        }
    });
}

// Função para configurar a navegação entre as páginas
function setupNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-nav a');
    const dashboardView = document.getElementById('dashboard-view');
    const calendarView = document.getElementById('calendar-view');
    const analisesView = document.getElementById('analises-view');
    let calendarInitialized = false; // Flag para controlar se o calendário já foi inicializado
    
    // Verificar qual página está ativa com base na URL hash
    function checkActivePage() {
        const hash = window.location.hash || '#dashboard';
        const previousHash = window._previousHash || '';
        window._previousHash = hash; // Armazenar hash atual para referência futura
        
        console.log(`Navegando de '${previousHash}' para '${hash}'`);
        
        // Remover a classe active de todos os itens de menu
        menuItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Adicionar a classe active ao item de menu correspondente à página atual
        const activeMenuItem = document.querySelector(`.sidebar-nav a[href="${hash}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }
        
        // Ocultar todas as views
        if (dashboardView) dashboardView.style.display = 'none';
        if (calendarView) calendarView.style.display = 'none';
        if (analisesView) analisesView.style.display = 'none';
        
        // Mostrar a view correspondente
        if (hash === '#calendario') {
            if (calendarView) {
                calendarView.style.display = 'block';
                
                // Inicializar o calendário se necessário
                if (typeof initCalendar === 'function') {
                    initCalendar();
                    loadCalendarTasks();
                }
            }
        } else if (hash === '#analises') {
            if (analisesView) {
                analisesView.style.display = 'block';
                
                // Garantir que os dados estejam disponíveis antes de atualizar os gráficos
                if (!window.tasks) {
                    console.warn('window.tasks não inicializado ao entrar na página de análises. Recuperando do localStorage...');
                    const storedTasks = localStorage.getItem('tasks');
                    if (storedTasks) {
                        try {
                            window.tasks = JSON.parse(storedTasks);
                            console.log('Tarefas recuperadas do localStorage para página de análises');
                        } catch (e) {
                            console.error('Erro ao parsear tarefas do localStorage:', e);
                            window.tasks = {
                                day: [],
                                week: [],
                                month: [],
                                year: []
                            };
                        }
                    } else {
                        console.warn('Nenhuma tarefa encontrada no localStorage para página de análises');
                        window.tasks = {
                            day: [],
                            week: [],
                            month: [],
                            year: []
                        };
                    }
                }
                
                // Forçar uma atualização completa dos gráficos quando navega para a página de análises
                setTimeout(() => {
                    if (typeof updateAnalytics === 'function') {
                        console.log('Atualizando gráficos após navegação para página de análises');
                        updateAnalytics();
                    } else if (typeof initAnalytics === 'function') {
                        console.log('Inicializando gráficos após navegação para página de análises');
                        initAnalytics();
                    }
                }, 100);
            }
        } else {
            if (dashboardView) dashboardView.style.display = 'block';
            
            // Configurar os badges de status no dashboard
            setTimeout(setupStatusBadges, 100);
        }
    }
    
    // Configurar os event listeners para os itens de menu
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Evitar o comportamento padrão do link
            e.preventDefault();
            
            // Atualizar a hash da URL
            window.location.hash = this.getAttribute('href');
            
            // Verificar qual página está ativa
            checkActivePage();
        });
    });
    
    // Verificar qual página está ativa quando a página é carregada
    checkActivePage();
    
    // Adicionar um listener para o evento hashchange
    window.addEventListener('hashchange', checkActivePage);
}

// Função para configurar os badges de status
function setupStatusBadges() {
    console.log("Configurando badges de status");
    
    // Remover listeners antigos para evitar duplicação
    document.querySelectorAll('.status-badge').forEach(badge => {
        const clonedBadge = badge.cloneNode(true);
        badge.parentNode.replaceChild(clonedBadge, badge);
    });
    
    // Adicionar novos listeners
    document.querySelectorAll('.status-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            const statusOption = e.target.closest('.status-option');
            if (!statusOption) {
                console.log("Não encontrou status-option");
                return;
            }
            
            const radioInput = statusOption.querySelector('input[type="radio"]');
            if (!radioInput) {
                console.log("Não encontrou input radio");
                return;
            }
            
            const status = radioInput.value;
            console.log("Badge clicado:", status);
            
            // Marcar o radio como selecionado
            radioInput.checked = true;
            
            // Filtrar as tarefas
            filterTasksByStatus(status);
        });
    });
    
    console.log("Badges de status configurados");
}

// Função para limpar elementos duplicados no calendário
function cleanupCalendarDuplicates() {
    // Executar esta função periodicamente para evitar duplicações
    setInterval(() => {
        // Verificar se estamos na página do calendário
        if (window.location.hash === '#calendario') {
            const calendarContainer = document.getElementById('calendar-container');
            if (calendarContainer) {
                // Remover controles de navegação duplicados (manter apenas o primeiro)
                const controls = calendarContainer.querySelectorAll('.calendar-controls');
                if (controls.length > 1) {
                    for (let i = 1; i < controls.length; i++) {
                        controls[i].remove();
                    }
                }
                
                // Remover grids de calendário duplicados (manter apenas o último, que é o mais atualizado)
                const grids = calendarContainer.querySelectorAll('.calendar-grid');
                if (grids.length > 1) {
                    for (let i = 0; i < grids.length - 1; i++) {
                        grids[i].remove();
                    }
                }
                
                // Remover títulos duplicados "Mês Ano" (manter apenas o primeiro)
                const monthYears = calendarContainer.querySelectorAll('#calendar-month-year');
                if (monthYears.length > 1) {
                    for (let i = 1; i < monthYears.length; i++) {
                        monthYears[i].remove();
                    }
                }
            }
        }
    }, 500); // Verificar a cada meio segundo
}

// Iniciar a limpeza de duplicados quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupStatusBadges, 500);
    cleanupCalendarDuplicates(); // Iniciar verificação anti-duplicação
});

// Função para adicionar uma nova tarefa
function addTask(e) {
    e.preventDefault();
    
    try {
        // Obter os dados do formulário
        const form = document.getElementById('add-task-form');
        const titleInput = document.getElementById('task-title');
        const descriptionInput = document.getElementById('task-description');
        const startDateInput = document.getElementById('task-start-date');
        const endDateInput = document.getElementById('task-end-date');
        const categoryInput = document.getElementById('task-category');
        const priorityInput = document.getElementById('task-priority');
        
        // Validar os dados do formulário
        if (!titleInput.value.trim()) {
            showErrorNotification('Por favor, informe um título para a tarefa.');
            return;
        }
        
        // Verificar se as datas são válidas
        // A data de início não pode ser maior que a data de término
        if (startDateInput.value && endDateInput.value) {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            
            if (startDate > endDate) {
                showErrorNotification('A data de início não pode ser maior que a data de término.');
                return;
            }
        }
        
        // Gerar ID único para a tarefa
        const taskId = 'task_' + Date.now();
        
        // Criar objeto da tarefa
        const task = {
            id: taskId,
            title: titleInput.value.trim(),
            description: descriptionInput.value.trim(),
            startDate: startDateInput.value,
            endDate: endDateInput.value,
            category: categoryInput.value,
            priority: priorityInput.value,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Verificar se window.tasks está inicializado
        if (!window.tasks) {
            console.error('window.tasks não está inicializado');
            window.tasks = {
                day: [],
                week: [],
                month: [],
                year: []
            };
        }
        
        // Adicionar a tarefa à categoria apropriada
        window.tasks[task.category].push(task);
        
        // Salvar as tarefas no localStorage
        saveTasks();
        
        // Atualizar a lista de tarefas
        renderTasks();
        
        // Fechar o modal
        const addTaskModal = document.getElementById('add-task-modal');
        if (addTaskModal) {
            addTaskModal.style.display = 'none';
        }
        
        // Limpar o formulário
        form.reset();
        
        // Exibir notificação de sucesso
        showSuccessNotification('Tarefa adicionada com sucesso!');
        
        // Atualizar os gráficos
        if (typeof updateAnalytics === 'function') {
            console.log('Atualizando análises após adicionar tarefa');
            updateAnalytics();
        }
        
        // Atualizar o calendário
        if (typeof loadCalendarTasks === 'function') {
            console.log('Atualizando calendário após adicionar tarefa');
            loadCalendarTasks();
        }
    } catch (error) {
        console.error('Erro ao adicionar tarefa:', error);
        showErrorNotification('Ocorreu um erro ao adicionar a tarefa. Por favor, tente novamente.');
    }
}

// Função para atualizar o status de uma tarefa
function updateTaskStatus(taskId, newStatus) {
    try {
        // Verificar se window.tasks está inicializado
        if (!window.tasks) {
            console.error('window.tasks não está inicializado');
            return false;
        }
        
        // Buscar a tarefa em todas as categorias
        let taskFound = false;
        
        Object.keys(window.tasks).forEach(category => {
            const taskIndex = window.tasks[category].findIndex(task => task.id === taskId);
            
            if (taskIndex !== -1) {
                const task = window.tasks[category][taskIndex];
                task.status = newStatus;
                task.updatedAt = new Date().toISOString();
                
                // Se a tarefa foi concluída, registrar a data de conclusão
                if (newStatus === 'completed' || newStatus === 'finished') {
                    task.completedAt = new Date().toISOString();
                }
                
                // Atualizar a tarefa na lista
                window.tasks[category][taskIndex] = task;
                taskFound = true;
            }
        });
        
        if (taskFound) {
            // Salvar as tarefas no localStorage
            saveTasks();
            
            // Atualizar a lista de tarefas
            renderTasks();
            
            // Exibir notificação de sucesso
            showSuccessNotification(`Status da tarefa atualizado para ${getStatusText(newStatus)}!`);
            
            // Atualizar os gráficos
            if (typeof updateAnalytics === 'function') {
                console.log('Atualizando análises após mudança de status');
                updateAnalytics();
            }
            
            // Atualizar o calendário
            if (typeof loadCalendarTasks === 'function') {
                console.log('Atualizando calendário após mudança de status');
                loadCalendarTasks();
            }
            
            return true;
        } else {
            console.error('Tarefa não encontrada:', taskId);
            return false;
        }
    } catch (error) {
        console.error('Erro ao atualizar status da tarefa:', error);
        showErrorNotification('Ocorreu um erro ao atualizar o status da tarefa.');
        return false;
    }
}

// Função para deletar uma tarefa
function deleteTask(taskId) {
    try {
        // Confirmar exclusão
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) {
            return;
        }
        
        // Verificar se window.tasks está inicializado
        if (!window.tasks) {
            console.error('window.tasks não está inicializado');
            return false;
        }
        
        // Buscar a tarefa em todas as categorias
        let taskFound = false;
        
        Object.keys(window.tasks).forEach(category => {
            const taskIndex = window.tasks[category].findIndex(task => task.id === taskId);
            
            if (taskIndex !== -1) {
                // Remover a tarefa da lista
                window.tasks[category].splice(taskIndex, 1);
                taskFound = true;
            }
        });
        
        if (taskFound) {
            // Salvar as tarefas no localStorage
            saveTasks();
            
            // Atualizar a lista de tarefas
            renderTasks();
            
            // Exibir notificação de sucesso
            showSuccessNotification('Tarefa excluída com sucesso!');
            
            // Atualizar os gráficos
            if (typeof updateAnalytics === 'function') {
                console.log('Atualizando análises após excluir tarefa');
                updateAnalytics();
            }
            
            // Atualizar o calendário
            if (typeof loadCalendarTasks === 'function') {
                console.log('Atualizando calendário após excluir tarefa');
                loadCalendarTasks();
            }
            
            return true;
        } else {
            console.error('Tarefa não encontrada:', taskId);
            return false;
        }
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        showErrorNotification('Ocorreu um erro ao excluir a tarefa.');
        return false;
    }
} 