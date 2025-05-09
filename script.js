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
    console.log('Verificando status de tarefas automaticamente...');
    let updated = false;
    let updatedTasks = [];
    let completedTasksChecked = 0;
    
    // Verificar se window.tasks está inicializado
    if (!window.tasks) {
        console.error('window.tasks não está inicializado ao verificar status');
        return;
    }
    
    Object.keys(window.tasks).forEach(category => {
        window.tasks[category].forEach(task => {
            let newStatus = task.status;
            
            // Verificar tarefas com status diferente de 'finished'
            if (task.status !== 'finished') {
                
                // Lógica para tarefas concluídas: mudar para finalizado após 2 horas
                if (task.status === 'completed' && task.completedAt) {
                    completedTasksChecked++;
                    const completedTime = new Date(task.completedAt).getTime();
                    const currentTime = new Date().getTime();
                    const hoursElapsed = (currentTime - completedTime) / (1000 * 60 * 60);
                    
                    console.log(`Verificando tarefa concluída: "${task.text}" - Concluída há ${hoursElapsed.toFixed(2)} horas`);
                    
                    // Se passaram 2 horas ou mais desde a conclusão
                    if (hoursElapsed >= 2) {
                        newStatus = 'finished';
                        console.log(`Tarefa "${task.text}" movida para finalizado após ${hoursElapsed.toFixed(2)} horas de conclusão`);
                        updated = true;
                        
                        // Adicionar notificação para o usuário
                        showInfoNotification(`Tarefa "${task.text}" foi finalizada automaticamente após ${Math.floor(hoursElapsed)} horas de conclusão`);
                    }
                }
                // Lógica para tarefas em atraso ou em andamento
                else if (task.status !== 'completed') {
                    const wasLate = task.status === 'late';
                    const isLate = isTaskLate(task);
                    const inProgress = isTaskInProgress(task);
                    
                    if (isLate && !wasLate) {
                        newStatus = 'late';
                        updated = true;
                    } else if (inProgress && task.status !== 'pending') {
                        newStatus = 'pending';
                        updated = true;
                    }
                }
                
                // Atualizar status se mudou
                if (newStatus !== task.status) {
                    task.status = newStatus;
                    
                    // Adicionar timestamp para finalizados
                    if (newStatus === 'finished') {
                        task.finishedAt = new Date().toISOString();
                    }
                    
                    updatedTasks.push({
                        id: task.id,
                        text: task.text,
                        status: newStatus,
                        ...(newStatus === 'finished' ? { finishedAt: task.finishedAt } : {})
                    });
                }
            }
        });
    });
    
    console.log(`Verificação concluída: ${completedTasksChecked} tarefas concluídas verificadas, ${updatedTasks.length} atualizadas`);
    
    if (updated) {
        // Atualizar no localStorage
        saveTasks();
        
        // Atualizar a interface
        renderTasks();
        
        // Atualizar os gráficos
        if (typeof updateAnalytics === 'function') {
            console.log('Atualizando análises após mudança automática de status');
            updateAnalytics();
        }
        
        // Atualizar o calendário
        if (typeof loadCalendarTasks === 'function') {
            console.log('Atualizando calendário após mudança automática de status');
            loadCalendarTasks();
        }
        
        // Enviar todas as atualizações de status para o servidor (Supabase)
        try {
            console.log(`Enviando ${updatedTasks.length} atualizações de status para o servidor...`);
            
            // Processar cada tarefa atualizada
            const updatePromises = updatedTasks.map(async (task) => {
                try {
                    // Criar objeto de atualização para o servidor
                    const serverUpdate = {
                        status: task.status
                    };
                    
                    // Adicionar finishedAt se necessário
                    if (task.status === 'finished' && task.finishedAt) {
                        serverUpdate.finishedAt = task.finishedAt;
                    }
                    
                    // Enviar para o Supabase
                    const result = await window.supabaseApi.updateTask(task.id, serverUpdate);
                    return { id: task.id, success: !!result };
                } catch (error) {
                    console.error(`Erro ao atualizar tarefa ${task.id} (${task.text}) no servidor:`, error);
                    return { id: task.id, success: false, error };
                }
            });
            
            // Aguardar todas as atualizações
            const results = await Promise.allSettled(updatePromises);
            
            // Verificar resultados
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failCount = updatedTasks.length - successCount;
            
            console.log(`Atualizações no servidor: ${successCount} bem-sucedidas, ${failCount} falhas`);
            
            if (failCount > 0) {
                showWarningNotification(`${failCount} tarefas não puderam ser atualizadas no servidor.`);
            }
        } catch (error) {
            console.error('Erro ao enviar atualizações automáticas para o servidor:', error);
            showWarningNotification('Não foi possível sincronizar algumas alterações de status com o servidor.');
        }
        
        console.log(`${updatedTasks.length} tarefas tiveram status atualizado automaticamente`);
    }
}

// Função para filtrar tarefas
function filterTasks(searchTerm) {
    const term = searchTerm.toLowerCase();
    const tableBody = document.getElementById('task-table-body');
    const rows = tableBody.querySelectorAll('tr');
    
    let visibleCount = 0;
    
    rows.forEach(row => {
        const taskText = row.querySelector('.title-cell').textContent.toLowerCase();
        const isVisible = taskText.includes(term);
        
        row.style.display = isVisible ? '' : 'none';
        
        if (isVisible) {
            visibleCount++;
        }
    });
    
    // Mostrar mensagem se não houver resultados
    const noTasksMessage = document.getElementById('no-tasks-message');
    if (noTasksMessage) {
        noTasksMessage.style.display = visibleCount === 0 ? 'flex' : 'none';
    }
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
    
    // Obter todas as tarefas
    let allTasks = [];
    let filteredTasks = [];
    const periodFilter = document.querySelector('input[name="period-filter"]:checked')?.value || 'all';
    const statusFilter = document.querySelector('input[name="status-filter"]:checked')?.value || 'all';
    
    console.log('Aplicando filtros:', 'Período:', periodFilter, 'Status:', statusFilter);
    
    // Combinar tarefas de todas as categorias
    Object.keys(window.tasks).forEach(category => {
        // Se filtro de período não for 'all', apenas processar a categoria correspondente
        if (periodFilter === 'all' || periodFilter === category) {
            window.tasks[category].forEach(task => {
                // Adicionar categoria como propriedade da tarefa para exibição
                task.periodCategory = category;
                allTasks.push(task);
            });
        }
    });
    
    // Aplicar filtro de status
    filteredTasks = statusFilter === 'all' 
        ? allTasks 
        : allTasks.filter(task => task.status === statusFilter);
    
    console.log('Tarefas filtradas:', filteredTasks.length, 'de', allTasks.length, 'tarefas totais');
    
    // Ordenar tarefas: primeiro as fixadas, depois as não fixadas
    filteredTasks.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });
    
    // Obter o elemento da tabela
    const tableBody = document.getElementById('task-table-body');
    const noTasksMessage = document.getElementById('no-tasks-message');
    
    // Limpar a tabela
    tableBody.innerHTML = '';
    
    // Mostrar mensagem se não houver tarefas
    if (filteredTasks.length === 0) {
        if (noTasksMessage) {
            noTasksMessage.style.display = 'flex';
        }
        return;
    } else {
        if (noTasksMessage) {
            noTasksMessage.style.display = 'none';
        }
    }
    
    // Renderizar cada tarefa
    filteredTasks.forEach(task => {
        const { row, statusSelect, editButton, commentsButton, commentsCount, pinButton, deleteButton } = createTaskRow(task);
        
        // Evento para botão de editar
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditTaskModal(task);
        });
        
        // Evento para botão de comentários
        commentsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            openCommentsModal(task.id);
        });
        
        // Evento para botão de fixar
        pinButton.addEventListener('click', (e) => {
            e.stopPropagation();
            // Inverter o estado de fixação
            toggleTaskPin(task.id);
        });
        
        // Evento para botão de excluir
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });
        
        // Evento para mudar status
        statusSelect.addEventListener('change', async (e) => {
            const newStatus = e.target.value;
            
            // Atualizar no estado local
            const originalCategory = task.periodCategory;
            const originalIndex = window.tasks[originalCategory].findIndex(t => t.id === task.id);
            
            if (originalIndex !== -1) {
                window.tasks[originalCategory][originalIndex].status = newStatus;
                
                // Aplicar a classe do novo status à linha
                row.className = `task-row status-${newStatus}`;
                if (task.pinned) {
                    row.classList.add('pinned');
                }
                
                // Atualizar estilo do select
                statusSelect.className = `status-select status-${newStatus}`;
                
                // Atualizar também no banco de dados/storage
                updateTaskStatus(task.id, newStatus);
                
                // Re-renderizar para aplicar os filtros, se necessário
                renderTasks();
            }
        });
        
        // Adicionar a linha à tabela
        tableBody.appendChild(row);
    });
}

// Função para criar linha da tarefa na tabela
function createTaskRow(task) {
    const row = document.createElement('tr');
    row.className = `task-row status-${task.status}`;
    row.dataset.id = task.id;
    
    // Adicionar classe de tarefa fixada, se aplicável
    if (task.pinned) {
        row.classList.add('pinned');
    }
    
    // Mapeamento de categorias para texto amigável
    const periodNames = {
        day: 'Dia',
        week: 'Semana',
        month: 'Mês',
        year: 'Ano'
    };
    
    // Coluna Período
    const periodCell = document.createElement('td');
    periodCell.className = 'period-cell';
    periodCell.textContent = periodNames[task.periodCategory] || task.periodCategory;
    
    // Coluna Nome da Tarefa
    const titleCell = document.createElement('td');
    titleCell.className = 'title-cell';
    titleCell.textContent = task.text;
    
    // Coluna Data de Início
    const startDateCell = document.createElement('td');
    startDateCell.className = 'date-cell';
    startDateCell.textContent = formatDateTime(task.startDate);
    
    // Coluna Data Final
    const endDateCell = document.createElement('td');
    endDateCell.className = 'date-cell';
    endDateCell.textContent = formatDateTime(task.endDate);
    
    // Coluna Status
    const statusCell = document.createElement('td');
    statusCell.className = 'status-cell';
    
    const statusSelect = document.createElement('select');
    statusSelect.className = `status-select status-${task.status}`;
    
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
    
    statusCell.appendChild(statusSelect);
    
    // Coluna Ações
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';
    
    // Botão Editar
    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    editButton.title = 'Editar tarefa';
    
    // Botão de comentários
    const commentsButton = document.createElement('button');
    commentsButton.className = 'comments-button';
    commentsButton.innerHTML = '<i class="fas fa-comments"></i>';
    commentsButton.title = 'Ver comentários';
    
    // Contador de comentários
    const commentsCount = document.createElement('span');
    commentsCount.className = 'comments-count';
    commentsCount.style.display = 'none';
    commentsButton.appendChild(commentsCount);
    
    // Botão de fixar
    const pinButton = document.createElement('button');
    pinButton.className = 'pin-button';
    pinButton.innerHTML = task.pinned 
        ? '<i class="fas fa-thumbtack pinned" title="Desafixar"></i>' 
        : '<i class="fas fa-thumbtack" title="Fixar"></i>';
    pinButton.title = task.pinned ? 'Desafixar' : 'Fixar';
    
    // Botão de excluir
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteButton.title = 'Excluir tarefa';
    
    // Adicionar botões à célula de ações
    actionsCell.appendChild(editButton);
    actionsCell.appendChild(commentsButton);
    actionsCell.appendChild(pinButton);
    actionsCell.appendChild(deleteButton);
    
    // Adicionar células à linha
    row.appendChild(periodCell);
    row.appendChild(titleCell);
    row.appendChild(startDateCell);
    row.appendChild(endDateCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);
    
    // Eventos dos botões serão adicionados na função renderTasks
    
    // Carregar contagem de comentários
    loadCommentsCount(task.id);
    
    return { row, statusSelect, editButton, commentsButton, commentsCount, pinButton, deleteButton };
}

// Função para abrir modal de edição de tarefa
function openEditTaskModal(task) {
    // Verificar se o modal existe
    if (!taskFormModal) {
        console.error("Modal não encontrado!");
        return;
    }
    
    // Preparar o formulário para edição
    const form = document.getElementById('task-form');
    const titleInput = document.getElementById('task-input');
    const categorySelect = document.getElementById('task-category');
    const startDateInput = document.getElementById('task-start-date');
    const endDateInput = document.getElementById('task-end-date');
    
    // Atualizar título do modal
    document.querySelector('.form-header h3').textContent = 'Editar Tarefa';
    
    // Preencher o formulário com os dados da tarefa
    titleInput.value = task.text;
    categorySelect.value = task.periodCategory;
    
    // Formatar as datas para o formato esperado pelo input datetime-local
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    
    // Transformar a data em string no formato YYYY-MM-DDThh:mm
    startDateInput.value = startDate.toISOString().slice(0, 16);
    endDateInput.value = endDate.toISOString().slice(0, 16);
    
    // Selecionar o status correto
    document.querySelector(`input[name="status"][value="${task.status}"]`).checked = true;
    
    // Alterar o texto do botão de submit
    const submitButton = document.querySelector('.btn-submit');
    submitButton.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
    
    // Armazenar o ID da tarefa em edição
    form.dataset.editTaskId = task.id;
    
    // Abrir o modal
    openModal();
    
    // Modificar o comportamento do formulário para edição
    const originalSubmitHandler = form.onsubmit;
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const text = titleInput.value.trim();
        const category = categorySelect.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
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
            const updatedISO = new Date().toISOString();
            
            // ID da tarefa em edição
            const taskId = form.dataset.editTaskId;
            
            // Buscar a categoria original da tarefa
            const originalCategory = task.periodCategory;
            const originalIndex = window.tasks[originalCategory].findIndex(t => t.id === taskId);
            
            if (originalIndex !== -1) {
                // Criar objeto com as alterações
                const updatedTask = {
                    ...window.tasks[originalCategory][originalIndex],
                    text,
                    startDate: startISO,
                    endDate: endISO,
                    status,
                    updatedAt: updatedISO
                };
                
                try {
                    // Mostrar indicador de carregamento
                    showButtonLoading(submitButton);
                    
                    // Se a categoria mudou, precisamos mover a tarefa
                    if (originalCategory !== category) {
                        // Remover da categoria original
                        window.tasks[originalCategory].splice(originalIndex, 1);
                        
                        // Adicionar na nova categoria
                        window.tasks[category].push(updatedTask);
                    } else {
                        // Atualizar na mesma categoria
                        window.tasks[originalCategory][originalIndex] = updatedTask;
                    }
                    
                    // Salvar no localStorage e atualizar analytics
                    saveTasks();
                    
                    // Atualizar no Supabase
                    try {
                        await window.supabaseApi.updateTask(taskId, updatedTask);
                    } catch (error) {
                        console.error('Erro ao atualizar tarefa no Supabase:', error);
                        showWarningNotification('Tarefa atualizada localmente, mas não no servidor.');
                    }
                    
                    // Renderizar novamente as tarefas
                    renderTasks();
                    
                    // Mostrar notificação de sucesso
                    showSuccessNotification('Tarefa atualizada com sucesso!');
                    
                    // Fechar o modal e resetar o formulário
                    closeModal();
                    setTimeout(() => {
                        // Resetar o formulário para o estado de adicionar nova tarefa
                        document.querySelector('.form-header h3').textContent = 'Nova Tarefa';
                        submitButton.innerHTML = '<i class="fas fa-plus"></i> Adicionar Tarefa';
                        form.removeAttribute('data-edit-task-id');
                        form.reset();
                        
                        // Restaurar o comportamento original do formulário
                        form.onsubmit = originalSubmitHandler;
                    }, 300);
                } catch (error) {
                    console.error('Erro ao atualizar tarefa:', error);
                    showErrorNotification('Erro ao atualizar tarefa');
                } finally {
                    // Esconder indicador de carregamento
                    hideButtonLoading(submitButton);
                }
            }
        }
    };
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
            const savedTask = await window.supabaseApi.addTask(newTask);
            
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
// setInterval(updateTasksStatus, 1000 * 60); // Atualiza a cada minuto -- removido para evitar duplicação

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

// Função aprimorada para notificações de sucesso
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    // Animar entrada com efeito deslizante
    notification.animate([
        { transform: 'translateX(100px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
    ], {
        duration: 400,
        easing: 'ease-out',
        fill: 'forwards'
    });
    
    // Animar saída após delay
    setTimeout(() => {
        notification.animate([
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(100px)', opacity: 0 }
        ], {
            duration: 400,
            easing: 'ease-in',
            fill: 'forwards'
        }).onfinish = () => notification.remove();
    }, 3000);
    
    // Garantir que o modal está fechado
    closeModal();
}

// Função aprimorada para notificações de erro
function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    // Animar com efeito de shake para alertar o usuário
    notification.animate([
        { transform: 'translateX(100px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
    ], {
        duration: 400,
        easing: 'ease-out',
        fill: 'forwards'
    }).onfinish = () => {
        // Adicionar efeito de shake após aparecer
        notification.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-5px)' },
            { transform: 'translateX(5px)' },
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(3px)' },
            { transform: 'translateX(0)' }
        ], {
            duration: 500,
            easing: 'ease-in-out'
        });
    };
    
    // Animar saída após delay mais longo para erros
    setTimeout(() => {
        notification.animate([
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(100px)', opacity: 0 }
        ], {
            duration: 400,
            easing: 'ease-in',
            fill: 'forwards'
        }).onfinish = () => notification.remove();
    }, 4000);
}

// Função aprimorada para notificações de aviso
function showWarningNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification warning';
    notification.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    // Animar entrada
    notification.animate([
        { transform: 'translateX(100px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
    ], {
        duration: 400,
        easing: 'ease-out',
        fill: 'forwards'
    });
    
    // Animar saída após delay
    setTimeout(() => {
        notification.animate([
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(100px)', opacity: 0 }
        ], {
            duration: 400,
            easing: 'ease-in',
            fill: 'forwards'
        }).onfinish = () => notification.remove();
    }, 3500);
}

// Função aprimorada para notificações informativas
function showInfoNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification info';
    notification.innerHTML = `
        <i class="fas fa-info-circle"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    // Animar entrada
    notification.animate([
        { transform: 'translateX(100px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
    ], {
        duration: 400,
        easing: 'ease-out',
        fill: 'forwards'
    });
    
    // Animar saída após delay
    setTimeout(() => {
        notification.animate([
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(100px)', opacity: 0 }
        ], {
            duration: 400,
            easing: 'ease-in',
            fill: 'forwards'
        }).onfinish = () => notification.remove();
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
function handleAddTaskEvent(e) {
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
        let updatedTask = null;
        
        Object.keys(window.tasks).forEach(category => {
            const taskIndex = window.tasks[category].findIndex(task => task.id === taskId);
            
            if (taskIndex !== -1) {
                const task = window.tasks[category][taskIndex];
                const oldStatus = task.status;
                task.status = newStatus;
                task.updatedAt = new Date().toISOString();
                
                // Se a tarefa foi concluída, registrar a data de conclusão
                if (newStatus === 'completed' && oldStatus !== 'completed') {
                    task.completedAt = new Date().toISOString();
                    console.log(`Tarefa "${task.text}" marcada como concluída em ${new Date().toLocaleString()}`);
                    console.log(`Timestamp de conclusão registrado: ${task.completedAt}`);
                }
                
                // Se a tarefa foi finalizada, registrar a data de finalização
                if (newStatus === 'finished' && oldStatus !== 'finished') {
                    task.finishedAt = new Date().toISOString();
                    console.log(`Tarefa "${task.text}" marcada como finalizada em ${new Date().toLocaleString()}`);
                }
                
                // Atualizar a tarefa na lista
                window.tasks[category][taskIndex] = task;
                updatedTask = task;
                taskFound = true;
            }
        });
        
        if (taskFound && updatedTask) {
            // Enviar a atualização para o servidor primeiro
            try {
                console.log('Enviando atualização de status para o servidor:', updatedTask);
                // Criar objeto com apenas os campos necessários para atualização
                const serverUpdate = {
                    status: newStatus,
                    updatedAt: updatedTask.updatedAt
                };
                
                // Adicionar campos condicionais
                if (newStatus === 'completed') {
                    serverUpdate.completedAt = updatedTask.completedAt;
                }
                if (newStatus === 'finished') {
                    serverUpdate.finishedAt = updatedTask.finishedAt;
                }
                
                // Enviar para o Supabase
                window.supabaseApi.updateTask(taskId, serverUpdate)
                    .then(result => {
                        if (result) {
                            console.log('Status atualizado com sucesso no servidor');
                        } else {
                            console.warn('Falha ao atualizar status no servidor, mas foi salvo localmente');
                            showWarningNotification('Status atualizado localmente, mas não no servidor.');
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao enviar atualização para o servidor:', error);
                        showWarningNotification('Status atualizado localmente, mas não no servidor.');
                    });
            } catch (serverError) {
                console.error('Erro ao tentar atualizar no servidor:', serverError);
                showWarningNotification('Status atualizado localmente, mas não no servidor.');
            }
            
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
        // Encontrar a tarefa para obter os detalhes
        let taskFound = false;
        let taskTitle = "";
        let taskCategory = null;
        let taskIndex = -1;
        
        Object.keys(window.tasks).forEach(category => {
            const index = window.tasks[category].findIndex(task => task.id === taskId);
            if (index !== -1) {
                taskFound = true;
                taskTitle = window.tasks[category][index].title || window.tasks[category][index].text;
                taskCategory = category;
                taskIndex = index;
            }
        });
        
        if (!taskFound) {
            console.error('Tarefa não encontrada:', taskId);
            return false;
        }
        
        // Adicionar classe de animação ao elemento antes da confirmação
        const taskElements = document.querySelectorAll(`[data-task-id="${taskId}"]`);
        taskElements.forEach(element => {
            element.classList.add('pre-delete');
            // Adicionar efeito de tremor
            element.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0)' }
            ], {
                duration: 400,
                iterations: 1
            });
        });
        
        // Exibir diálogo de confirmação elegante
        showConfirmDialog(
            'Excluir Tarefa',
            `Tem certeza que deseja excluir a tarefa "${taskTitle}"? Esta ação não pode ser desfeita.`,
            async () => {
                // Animar a remoção
                taskElements.forEach(element => {
                    element.classList.add('removing');
                });
                
                // Aguardar a animação terminar antes de remover do DOM
                setTimeout(async () => {
                    try {
                        // Primeiro tentar excluir no Supabase
                        try {
                            console.log(`Excluindo tarefa ${taskId} do Supabase...`);
                            // Aqui chamamos a função do supabase-config.js, usando seu namespace
                            const success = await window.supabaseApi.deleteTask(taskId);
                            
                            if (success) {
                                console.log(`Tarefa ${taskId} excluída com sucesso do Supabase.`);
                            } else {
                                console.error(`Falha ao excluir tarefa ${taskId} do Supabase.`);
                                showWarningNotification('Tarefa excluída localmente, mas pode permanecer no servidor.');
                            }
                        } catch (error) {
                            console.error('Erro na exclusão do Supabase:', error);
                            showWarningNotification('Tarefa excluída localmente, mas pode permanecer no servidor.');
                        }
                        
                        // Independentemente do resultado do Supabase, remover do estado local
                        window.tasks[taskCategory].splice(taskIndex, 1);
                        
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
                    } catch (error) {
                        console.error('Erro ao excluir tarefa:', error);
                        showErrorNotification('Ocorreu um erro ao excluir a tarefa.');
                    }
                }, 400); // Tempo para coincidir com a duração da animação
            },
            'delete' // Tipo especial para ações de exclusão
        );
        
        return true;
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        showErrorNotification('Ocorreu um erro ao excluir a tarefa.');
        return false;
    }
}

// Versão aprimorada da função para adicionar feedback visual para tarefas
function createTaskRow(task) {
    const row = document.createElement('tr');
    row.className = 'task-row';
    
    // Adicionar classe baseada no status
    if (task.status) {
        row.classList.add(`status-${task.status}`);
    }
    
    // Marcar tarefas fixadas
    if (task.pinned) {
        row.classList.add('pinned');
    }
    
    // Adicionar id da tarefa como atributo para facilitar manipulação
    row.setAttribute('data-task-id', task.id);
    
    // Adicionar classe de animação para novas tarefas
    row.classList.add('adding');
    
    // Remover a classe após a animação
    setTimeout(() => {
        row.classList.remove('adding');
    }, 500);
    
    // Adicionar células
    row.innerHTML = `
        <td class="period-cell">${getTaskPeriodText(task.category)}</td>
        <td class="title-cell">${task.title || task.text}</td>
        <td class="date-cell">
            <i class="far fa-calendar-alt"></i>
            ${formatDateTime(task.startDate)}
        </td>
        <td class="date-cell">
            <i class="far fa-calendar-check"></i>
            ${formatDateTime(task.endDate)}
        </td>
        <td class="status-cell">
            <select class="status-select status-${task.status}" data-task-id="${task.id}">
                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Em andamento</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Concluído</option>
                <option value="finished" ${task.status === 'finished' ? 'selected' : ''}>Finalizado</option>
                <option value="late" ${task.status === 'late' ? 'selected' : ''}>Em atraso</option>
            </select>
        </td>
        <td class="actions-cell">
            <button class="edit-button" title="Editar Tarefa">
                <i class="fas fa-edit"></i>
            </button>
            <button class="comments-button" title="Comentários">
                <i class="far fa-comment-alt"></i>
                <span class="comments-count" style="display: none;">0</span>
            </button>
            <button class="pin-button" title="${task.pinned ? 'Desafixar' : 'Fixar'} Tarefa">
                <i class="fas fa-thumbtack ${task.pinned ? 'pinned' : ''}"></i>
            </button>
            <button class="delete-button" title="Excluir Tarefa">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    `;
    
    // Obter referências para elementos
    const statusSelect = row.querySelector('.status-select');
    const editButton = row.querySelector('.edit-button');
    const commentsButton = row.querySelector('.comments-button');
    const commentsCount = row.querySelector('.comments-count');
    const pinButton = row.querySelector('.pin-button');
    const deleteButton = row.querySelector('.delete-button');
    
    // Configurar evento para alteração de status
    statusSelect.addEventListener('change', function(e) {
        const newStatus = e.target.value;
        const taskId = e.target.getAttribute('data-task-id');
        
        console.log(`Alterando status da tarefa ${taskId} para ${newStatus}`);
        
        // Adicionar classe para destacar a alteração
        row.classList.add('highlight-success');
        
        // Remover classe após a animação
        setTimeout(() => {
            row.classList.remove('highlight-success');
        }, 1500);
        
        updateTaskStatus(taskId, newStatus);
    });
    
    // Carregar contagem de comentários
    loadCommentsCount(task.id).then(count => {
        if (count > 0) {
            commentsCount.textContent = count;
            commentsCount.style.display = 'flex';
        }
    });
    
    return { row, statusSelect, editButton, commentsButton, commentsCount, pinButton, deleteButton };
}

// Função para forçar a sincronização com o servidor
async function syncTasksWithServer() {
    try {
        console.log('Iniciando sincronização com o servidor...');
        showInfoNotification('Sincronizando com o servidor...');
        
        // Verificar conexão com Supabase
        const isConnected = await window.supabaseApi.checkSupabaseConnection();
        
        if (!isConnected) {
            console.error('Não foi possível conectar ao Supabase para sincronização');
            showErrorNotification('Falha na conexão com o servidor. Tente novamente mais tarde.');
            return false;
        }
        
        // Armazenar cópia das tarefas locais para uso posterior na mesclagem
        const localTasks = JSON.parse(JSON.stringify(window.tasks));
        
        // Criar um mapa das tarefas locais para facilitar a comparação
        const localTasksMap = {};
        Object.keys(localTasks).forEach(category => {
            localTasks[category].forEach(task => {
                localTasksMap[task.id] = {
                    category,
                    task: { ...task },
                    updatedAt: task.updatedAt ? new Date(task.updatedAt).getTime() : 0
                };
            });
        });
        
        // Obter tarefas do servidor
        console.log('Buscando tarefas do servidor...');
        const serverTasks = await window.supabaseApi.fetchTasks();
        
        if (!serverTasks) {
            console.error('Falha ao buscar tarefas do servidor');
            showErrorNotification('Falha ao sincronizar com o servidor');
            return false;
        }
        
        // Contar tarefas locais antes da sincronização
        const localTasksCount = Object.keys(localTasks).reduce((count, category) => {
            return count + localTasks[category].length;
        }, 0);
        
        // Contar tarefas do servidor
        const serverTasksCount = Object.keys(serverTasks).reduce((count, category) => {
            return count + serverTasks[category].length;
        }, 0);
        
        console.log(`Comparando tarefas - Local: ${localTasksCount}, Servidor: ${serverTasksCount}`);
        
        // Tarefas para atualizar no servidor após a mesclagem
        const tasksToUpdateOnServer = [];
        
        // Mesclar tarefas do servidor com locais, preservando alterações locais mais recentes
        Object.keys(serverTasks).forEach(category => {
            serverTasks[category].forEach((serverTask, index) => {
                const localTaskInfo = localTasksMap[serverTask.id];
                
                // Se a tarefa existe localmente, verificar qual versão é mais recente
                if (localTaskInfo) {
                    const serverUpdatedAt = serverTask.updatedAt ? new Date(serverTask.updatedAt).getTime() : 0;
                    
                    // Se a versão local foi atualizada mais recentemente, manter seus dados (especialmente o status)
                    if (localTaskInfo.updatedAt > serverUpdatedAt) {
                        console.log(`Tarefa ${serverTask.id} (${serverTask.text}) mais recente localmente - preservando status local: ${localTaskInfo.task.status}`);
                        
                        // Atualizar a versão do servidor com os dados locais
                        serverTasks[category][index] = { ...serverTask, ...localTaskInfo.task };
                        
                        // Adicionar à lista para atualizar no servidor posteriormente
                        tasksToUpdateOnServer.push({
                            id: serverTask.id,
                            updates: {
                                status: localTaskInfo.task.status,
                                updatedAt: localTaskInfo.task.updatedAt,
                                ...(localTaskInfo.task.completedAt ? { completedAt: localTaskInfo.task.completedAt } : {}),
                                ...(localTaskInfo.task.finishedAt ? { finishedAt: localTaskInfo.task.finishedAt } : {})
                            }
                        });
                    } else {
                        console.log(`Tarefa ${serverTask.id} (${serverTask.text}) mais recente no servidor - usando status do servidor: ${serverTask.status}`);
                    }
                }
            });
        });
        
        // Verificar tarefas locais que não existem no servidor (possivelmente novas tarefas criadas offline)
        const serverTaskIds = new Set();
        Object.keys(serverTasks).forEach(category => {
            serverTasks[category].forEach(task => {
                serverTaskIds.add(task.id);
            });
        });
        
        // Encontrar tarefas locais que não existem no servidor
        const newLocalTasks = [];
        Object.keys(localTasks).forEach(category => {
            localTasks[category].forEach(task => {
                if (!serverTaskIds.has(task.id)) {
                    newLocalTasks.push({ category, task });
                }
            });
        });
        
        // Adicionar novas tarefas locais ao servidor e à estrutura mesclada
        if (newLocalTasks.length > 0) {
            console.log(`Encontradas ${newLocalTasks.length} novas tarefas locais para adicionar ao servidor`);
            
            for (const { category, task } of newLocalTasks) {
                // Adicionar à estrutura mesclada
                if (!serverTasks[category]) {
                    serverTasks[category] = [];
                }
                serverTasks[category].push(task);
                
                // Tentar adicionar ao servidor
                try {
                    const result = await window.supabaseApi.addTask(task);
                    if (result) {
                        console.log(`Tarefa ${task.id} (${task.text}) adicionada ao servidor com sucesso`);
                    } else {
                        console.warn(`Não foi possível adicionar a tarefa ${task.id} (${task.text}) ao servidor`);
                    }
                } catch (error) {
                    console.error(`Erro ao adicionar tarefa ${task.id} ao servidor:`, error);
                }
            }
        }
        
        // Atualizar tarefas no servidor com as alterações locais mais recentes
        if (tasksToUpdateOnServer.length > 0) {
            console.log(`Enviando ${tasksToUpdateOnServer.length} atualizações para o servidor...`);
            
            for (const { id, updates } of tasksToUpdateOnServer) {
                try {
                    await window.supabaseApi.updateTask(id, updates);
                    console.log(`Atualização para o servidor da tarefa ${id} concluída com sucesso`);
                } catch (error) {
                    console.error(`Erro ao atualizar tarefa ${id} no servidor:`, error);
                }
            }
        }
        
        // Atualizar o estado local com os dados mesclados
        window.tasks = serverTasks;
        
        // Salvar no localStorage
        localStorage.setItem('tasks', JSON.stringify(window.tasks));
        
        // Atualizar a interface
        renderTasks();
        
        // Atualizar os gráficos
        if (typeof updateAnalytics === 'function') {
            updateAnalytics();
        }
        
        // Atualizar o calendário
        if (typeof loadCalendarTasks === 'function') {
            loadCalendarTasks();
        }
        
        console.log('Sincronização com o servidor concluída');
        showSuccessNotification('Sincronização com o servidor concluída');
        return true;
    } catch (error) {
        console.error('Erro durante a sincronização:', error);
        showErrorNotification('Erro durante a sincronização com o servidor');
        return false;
    }
}

// Adicionar função de notificação informativa
function showInfoNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification info';
    notification.innerHTML = `
        <i class="fas fa-info-circle"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Função aprimorada para alternar o estado de fixação de uma tarefa
function toggleTaskPin(taskId) {
    try {
        // Verificar se window.tasks está inicializado
        if (!window.tasks) {
            console.error('window.tasks não está inicializado');
            return false;
        }
        
        // Buscar a tarefa em todas as categorias
        let taskFound = false;
        let task = null;
        let taskCategory = null;
        let taskIndex = -1;
        
        Object.keys(window.tasks).forEach(category => {
            const index = window.tasks[category].findIndex(t => t.id === taskId);
            
            if (index !== -1) {
                task = window.tasks[category][index];
                taskCategory = category;
                taskIndex = index;
                taskFound = true;
            }
        });
        
        if (!taskFound) {
            console.error('Tarefa não encontrada:', taskId);
            return false;
        }
        
        // Animar o elemento antes da mudança
        const taskElements = document.querySelectorAll(`[data-task-id="${taskId}"]`);
        
        // Animar o botão de pin
        const pinButtons = document.querySelectorAll(`[data-task-id="${taskId}"] .pin-button i`);
        pinButtons.forEach(icon => {
            icon.animate([
                { transform: 'rotate(0deg) scale(1)' },
                { transform: 'rotate(90deg) scale(1.5)' },
                { transform: task.pinned ? 'rotate(0deg) scale(1)' : 'rotate(-45deg) scale(1)' }
            ], {
                duration: 400,
                easing: 'ease-out',
                fill: 'forwards'
            });
        });
        
        // Adicionar efeito de pulsação nas linhas da tarefa
        taskElements.forEach(element => {
            element.animate([
                { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(138, 43, 226, 0)' },
                { transform: 'scale(1.01)', boxShadow: '0 0 0 3px rgba(138, 43, 226, 0.2)' },
                { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(138, 43, 226, 0)' }
            ], {
                duration: 600,
                easing: 'ease-out'
            });
        });
        
        // Inverter o estado de fixação
        task.pinned = !task.pinned;
        task.updatedAt = new Date().toISOString();
        
        // Atualizar a tarefa na lista
        window.tasks[taskCategory][taskIndex] = task;
        
        // Animar alteração para tarefa fixada/desafixada após breve delay
        setTimeout(() => {
            taskElements.forEach(element => {
                if (task.pinned) {
                    element.classList.add('pinned');
                    // Animar ao fixar
                    element.animate([
                        { backgroundColor: 'rgba(138, 43, 226, 0.05)' },
                        { backgroundColor: 'rgba(138, 43, 226, 0.15)' },
                        { backgroundColor: 'rgba(138, 43, 226, 0.05)' }
                    ], {
                        duration: 800,
                        easing: 'ease-out'
                    });
                } else {
                    element.classList.remove('pinned');
                }
            });
        }, 100);
        
        // Salvar as tarefas no localStorage
        saveTasks();
        
        // Mostrar notificação adequada com ícone
        if (task.pinned) {
            showSuccessNotification('<i class="fas fa-thumbtack"></i> Tarefa fixada com sucesso!');
        } else {
            showSuccessNotification('<i class="fas fa-thumbtack fa-rotate-90"></i> Tarefa desafixada com sucesso!');
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao alternar fixação da tarefa:', error);
        showErrorNotification('Ocorreu um erro ao atualizar a tarefa.');
        return false;
    }
}

// Configurar os filtros de período e status
function setupFilters() {
    // Filtro de período
    document.querySelectorAll('input[name="period-filter"]').forEach(radio => {
        radio.addEventListener('change', () => {
            console.log('Filtro de período alterado para:', radio.value);
            renderTasks(); // Re-renderizar tarefas com o novo filtro
        });
    });
    
    // Filtro de status
    document.querySelectorAll('input[name="status-filter"]').forEach(radio => {
        radio.addEventListener('change', () => {
            console.log('Filtro de status alterado para:', radio.value);
            renderTasks(); // Re-renderizar tarefas com o novo filtro
        });
    });
}

// Função para aplicar filtro de status programaticamente
function performFilterByStatus(status) {
    const statusRadio = document.querySelector(`input[name="status-filter"][value="${status}"]`);
    if (statusRadio) {
        statusRadio.checked = true;
        renderTasks();
    }
}

// Função para carregar tarefas (estava faltando)
async function loadTasks() {
    try {
        console.log('Iniciando carregamento de tarefas...');
        
        // Mostrar estado de carregamento
        showLoadingState();
        
        // Tentar obter as tarefas do Supabase
        let tasksLoaded = false;
        
        try {
            // Verificar conexão com Supabase
            const isConnected = await window.supabaseApi.checkSupabaseConnection();
            
            if (isConnected) {
                console.log('Conectado ao Supabase, buscando tarefas...');
                const fetchedTasks = await window.supabaseApi.fetchTasks();
                if (fetchedTasks) {
                    window.tasks = fetchedTasks;
                    
                    // Guardar uma cópia no localStorage para backup
                    localStorage.setItem('tasks', JSON.stringify(window.tasks));
                    
                    console.log('Tarefas carregadas do Supabase com sucesso:', 
                        Object.keys(window.tasks).reduce((total, key) => total + window.tasks[key].length, 0), 
                        'tarefas encontradas');
                    
                    tasksLoaded = true;
                    showSuccessNotification('Tarefas carregadas do servidor com sucesso!');
                }
            } else {
                console.error('Não foi possível conectar ao Supabase');
                throw new Error('Erro de conexão com o Supabase');
            }
        } catch (error) {
            console.error('Erro ao carregar tarefas do Supabase:', error);
            showWarningNotification('Não foi possível conectar ao servidor. Usando dados locais.');
        }
        
        // Se não conseguiu carregar do Supabase, tentar do localStorage
        if (!tasksLoaded) {
            console.log('Tentando carregar tarefas do localStorage...');
            const storedTasks = localStorage.getItem('tasks');
            
            if (storedTasks) {
                try {
                    window.tasks = JSON.parse(storedTasks);
                    console.log('Tarefas carregadas do localStorage com sucesso:', 
                        Object.keys(window.tasks).reduce((total, key) => total + window.tasks[key].length, 0), 
                        'tarefas encontradas');
                    
                    tasksLoaded = true;
                } catch (e) {
                    console.error('Erro ao parsear tarefas do localStorage:', e);
                }
            }
        }
        
        // Se ainda não conseguiu carregar, inicializar vazio
        if (!tasksLoaded) {
            console.log('Inicializando lista de tarefas vazia');
            window.tasks = {
                day: [],
                week: [],
                month: [],
                year: []
            };
        }
    } catch (error) {
        console.error('Erro geral ao carregar tarefas:', error);
        showErrorNotification('Erro ao carregar tarefas. Verifique o console para mais detalhes.');
        
        // Garantir que window.tasks exista mesmo em caso de erro
        window.tasks = window.tasks || {
            day: [],
            week: [],
            month: [],
            year: []
        };
    } finally {
        // Ocultar estado de carregamento, independentemente do resultado
        hideLoadingState();
        
        // Renderizar as tarefas, mesmo que esteja vazio
        renderTasks();
    }
}

// Função para configurar os ouvintes de eventos de formulário
function setupTaskForm() {
    const taskForm = document.getElementById('add-task-form');
    const taskTitle = document.getElementById('task-title');
    const taskDescription = document.getElementById('task-description');
    const taskStartDate = document.getElementById('task-start-date');
    const taskEndDate = document.getElementById('task-end-date');
    const taskCategory = document.getElementById('task-category');
    
    // Preencher a data atual
    if (taskStartDate) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;
        
        taskStartDate.value = today;
        
        // Definir a data final como 1 semana a partir de hoje por padrão
        if (taskEndDate) {
            const nextWeek = new Date();
            nextWeek.setDate(now.getDate() + 7);
            
            const yyyy2 = nextWeek.getFullYear();
            const mm2 = String(nextWeek.getMonth() + 1).padStart(2, '0');
            const dd2 = String(nextWeek.getDate()).padStart(2, '0');
            const nextWeekFormatted = `${yyyy2}-${mm2}-${dd2}`;
            
            taskEndDate.value = nextWeekFormatted;
        }
    }
    
    // Eventos de formulário
    if (taskForm) {
        // Remover manipulador antigo para evitar duplicação
        taskForm.removeEventListener('submit', handleAddTaskEvent);
        
        // Adicionar novo manipulador de eventos
        taskForm.addEventListener('submit', handleAddTaskEvent);
    }
}

// Função para adicionar uma nova tarefa
async function addNewTask(newTask) {
    try {
        // Primeiro tentar salvar no Supabase
        let savedTask = null;
        try {
            // Aqui chamamos a função do supabase-config.js
            savedTask = await window.supabaseApi.addTask(newTask);
            console.log('Tarefa salva no Supabase:', savedTask);
        } catch (error) {
            console.error('Erro ao salvar no Supabase:', error);
        }
        
        // Se falhou no Supabase, criar com ID local
        if (!savedTask) {
            savedTask = { ...newTask, id: 'local_' + Date.now() };
            console.log('Criando tarefa com ID local:', savedTask);
            showWarningNotification('Tarefa salva apenas localmente. A sincronização falhará.');
        } else {
            showSuccessNotification('Tarefa adicionada com sucesso!');
        }
        
        // Adicionar ao estado local e salvar
        if (!window.tasks[savedTask.category]) {
            window.tasks[savedTask.category] = [];
        }
        
        window.tasks[savedTask.category].push(savedTask);
        saveTasks();
        
        // Atualizar a UI
        renderTasks();
        
    } catch (error) {
        console.error('Erro ao adicionar tarefa:', error);
        showErrorNotification('Erro ao adicionar tarefa');
    }
}

// Função para atualizar uma tarefa existente
async function updateExistingTask(taskId, updatedData) {
    try {
        let taskFound = false;
        let originalCategory = null;
        
        // Encontrar a tarefa e sua categoria
        Object.keys(window.tasks).forEach(category => {
            const taskIndex = window.tasks[category].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                taskFound = true;
                originalCategory = category;
            }
        });
        
        if (!taskFound) {
            console.error('Tarefa não encontrada para atualização:', taskId);
            showErrorNotification('Tarefa não encontrada');
            return;
        }
        
        // Tentar atualizar no Supabase
        try {
            await window.supabaseApi.updateTask(taskId, updatedData);
            console.log('Tarefa atualizada no Supabase');
        } catch (error) {
            console.error('Erro ao atualizar no Supabase:', error);
            showWarningNotification('Atualização local bem-sucedida, mas falhou no servidor');
        }
        
        // Atualizar localmente
        const taskIndex = window.tasks[originalCategory].findIndex(t => t.id === taskId);
        
        // Se a categoria mudou, mover a tarefa
        if (originalCategory !== updatedData.category) {
            // Remover da categoria original
            const taskToMove = window.tasks[originalCategory].splice(taskIndex, 1)[0];
            
            // Atualizar dados da tarefa
            const updatedTask = { ...taskToMove, ...updatedData };
            
            // Adicionar na nova categoria
            if (!window.tasks[updatedData.category]) {
                window.tasks[updatedData.category] = [];
            }
            window.tasks[updatedData.category].push(updatedTask);
        } else {
            // Atualizar na mesma categoria
            window.tasks[originalCategory][taskIndex] = { 
                ...window.tasks[originalCategory][taskIndex], 
                ...updatedData 
            };
        }
        
        // Salvar e atualizar UI
        saveTasks();
        renderTasks();
        
        showSuccessNotification('Tarefa atualizada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao atualizar tarefa:', error);
        showErrorNotification('Erro ao atualizar tarefa');
    }
}

// Função para configurar os event listeners
function setupEventListeners() {
    // Limpar a variável global para não duplicar os event listeners
    if (window.eventListenersSet) return;
    
    // Evento para novo botão de tarefa
    if (newTaskBtn) {
        newTaskBtn.addEventListener('click', prepareNewTask);
    }
    
    // Eventos para fechar o modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Evento para o modal de fundo
    if (taskFormModal) {
        taskFormModal.addEventListener('click', (e) => {
            if (e.target === taskFormModal) closeModal();
        });
    }
    
    // Configurar o formulário com o manipulador de evento correto
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) {
        // Remover qualquer event listener antigo e adicionar o novo
        addTaskForm.removeEventListener('submit', addTask); // Remover a referência antiga
        addTaskForm.addEventListener('submit', handleAddTaskEvent); // Adicionar a referência nova
    }
    
    // Eventos de pesquisa
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterTasks(e.target.value);
        });
    }
    
    // Adicionar botão de sincronização no cabeçalho
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.getElementById('sync-button')) {
        const syncButton = document.createElement('button');
        syncButton.id = 'sync-button';
        syncButton.className = 'sync-button';
        syncButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
        syncButton.title = 'Sincronizar com o servidor';
        
        syncButton.addEventListener('click', () => {
            // Mostrar animação de rotação durante a sincronização
            syncButton.classList.add('rotating');
            
            // Chamar a função de sincronização
            syncTasksWithServer()
                .finally(() => {
                    // Remover a animação de rotação
                    setTimeout(() => {
                        syncButton.classList.remove('rotating');
                    }, 500);
                });
        });
        
        headerActions.prepend(syncButton);
    }
    
    // Marcar que os event listeners foram configurados
    window.eventListenersSet = true;
}

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando a aplicação TaskPRO...');
    
    // Carregar tarefas
    loadTasks();
    
    // Configurar navegação
    setupNavigation();
    
    // Configurar formulário de tarefas
    setupTaskForm();
    
    // Configurar badges de status
    setupStatusBadges();
    
    // Configurar filtros
    setupFilters();
    
    // Renderizar tarefas iniciais
    renderTasks();
    
    // Outras inicializações
    setupEventListeners();
    
    // Executar verificação imediata de status das tarefas
    console.log('Executando verificação inicial de status das tarefas...');
    updateTasksStatus();
    
    // Configurar intervalos para atualização periódica (substitui o setInterval anterior)
    // Verificar status a cada minuto
    if (window._statusUpdateInterval) {
        clearInterval(window._statusUpdateInterval);
    }
    
    window._statusUpdateInterval = setInterval(updateTasksStatus, 60 * 1000); // A cada minuto
    console.log('Verificação automática de status configurada para execução a cada minuto');
    
    // Configurar sincronização automática com o servidor a cada 10 Minutos
    if (window._serverSyncInterval) {
        clearInterval(window._serverSyncInterval);
    }
    
    window._serverSyncInterval = setInterval(() => {
        console.log('Executando sincronização automática com o servidor...');
        syncTasksWithServer().catch(error => {
            console.error('Erro na sincronização automática:', error);
        });
    }, 60* 10 * 1000); // A cada 10 Minutos
    
    // Sincronizar quando a página voltar a ficar visível
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('Página voltou a ficar visível, sincronizando com o servidor...');
            syncTasksWithServer().catch(error => {
                console.error('Erro na sincronização ao retornar à página:', error);
            });
            
            // Também verificar status das tarefas quando a página volta a ficar visível
            console.log('Verificando status das tarefas após retorno à página...');
            updateTasksStatus();
        }
    });
    
    console.log('Aplicação TaskPRO inicializada com sucesso!');
}); 

// Função para simulação de teste - marcar uma tarefa como concluída há X horas (para teste)
function simulateCompletedTask(taskId, hoursAgo = 2) {
    try {
        if (!window.tasks) {
            console.error('window.tasks não está inicializado');
            return false;
        }
        
        let taskFound = false;
        
        Object.keys(window.tasks).forEach(category => {
            const taskIndex = window.tasks[category].findIndex(task => task.id === taskId);
            
            if (taskIndex !== -1) {
                const task = window.tasks[category][taskIndex];
                
                // Definir status como completed
                task.status = 'completed';
                
                // Definir completedAt para X horas atrás
                const hoursInMs = hoursAgo * 60 * 60 * 1000;
                const completedTime = new Date(new Date().getTime() - hoursInMs);
                task.completedAt = completedTime.toISOString();
                
                console.log(`Tarefa "${task.text}" simulada como concluída há ${hoursAgo} horas (${completedTime.toLocaleString()})`);
                
                // Atualizar a tarefa
                window.tasks[category][taskIndex] = task;
                taskFound = true;
                
                // Salvar no localStorage
                saveTasks();
                
                // Renderizar tarefas
                renderTasks();
                
                // Exibir notificação
                showInfoNotification(`Tarefa "${task.text}" simulada como concluída há ${hoursAgo} horas. Aguarde a verificação automática.`);
            }
        });
        
        return taskFound;
    } catch (error) {
        console.error('Erro ao simular tarefa concluída:', error);
        return false;
    }
}

// Console helper para facilitar teste no console do navegador
window.simulateCompletedTask = simulateCompletedTask;

// Controle de menu para dispositivos móveis e responsividade
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Verificar tamanho da tela e orientação, e aplicar ajustes responsivos
    function applyResponsiveAdjustments() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const isLandscape = windowWidth > windowHeight;
        
        // Ajustes para dispositivos móveis
        if (windowWidth <= 768) {
            mobileMenuToggle.style.display = 'flex';
            
            // Aplicar classes para layout mobile
            document.body.classList.add('mobile-view');
            
            // Em dispositivos muito pequenos, fazer ajustes adicionais
            if (windowWidth <= 480) {
                document.body.classList.add('small-mobile-view');
                
                // Ajustes específicos para orientação
                if (isLandscape) {
                    document.body.classList.add('landscape-view');
                    document.body.classList.remove('portrait-view');
                } else {
                    document.body.classList.add('portrait-view');
                    document.body.classList.remove('landscape-view');
                }
            } else {
                document.body.classList.remove('small-mobile-view');
            }
        } else {
            // Desktop/tablet grande
            mobileMenuToggle.style.display = 'none';
            sidebar.classList.remove('show-mobile');
            document.body.classList.remove('mobile-view', 'small-mobile-view', 'landscape-view', 'portrait-view');
            
            // Ajustar para tablets
            if (windowWidth <= 1024) {
                document.body.classList.add('tablet-view');
            } else {
                document.body.classList.remove('tablet-view');
            }
        }
        
        // Ajustar altura dos contêineres para evitar problemas em telas pequenas
        adjustContainerHeights();
    }
    
    // Função para ajustar alturas de contêineres específicos
    function adjustContainerHeights() {
        // Ajustar altura das listas de tarefas para evitar sobreposição
        const taskLists = document.querySelectorAll('.task-list');
        if (taskLists.length > 0) {
            const windowHeight = window.innerHeight;
            const headerHeight = document.querySelector('.main-header')?.offsetHeight || 0;
            const pageHeaderHeight = document.querySelector('.page-header')?.offsetHeight || 0;
            
            const availableHeight = windowHeight - headerHeight - pageHeaderHeight - 100; // 100px para margens
            taskLists.forEach(list => {
                list.style.maxHeight = `${Math.max(300, availableHeight)}px`;
            });
        }
        
        // Ajustar modais conforme tamanho da tela
        adjustModalPositions();
    }
    
    // Ajustar posições de modais
    function adjustModalPositions() {
        const modals = document.querySelectorAll('.task-form, .comments-container, .confirm-box');
        const isMobile = window.innerWidth <= 768;
        
        modals.forEach(modal => {
            if (isMobile) {
                modal.style.maxHeight = '90vh';
            }
        });
    }
    
    // Alternar exibição da sidebar em dispositivos móveis
    mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('show-mobile');
        
        // Alternar ícone
        const icon = this.querySelector('i');
        if (sidebar.classList.contains('show-mobile')) {
            icon.className = 'fas fa-times';
            
            // Adicionar overlay para fechar o menu ao clicar fora
            if (!document.getElementById('sidebar-overlay')) {
                const overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                overlay.className = 'sidebar-overlay';
                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('show-mobile');
                    icon.className = 'fas fa-bars';
                    this.remove();
                });
                document.body.appendChild(overlay);
            }
        } else {
            icon.className = 'fas fa-bars';
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) overlay.remove();
        }
    });
    
    // Verificar tamanho inicial da tela
    applyResponsiveAdjustments();
    
    // Verificar quando a tela for redimensionada ou girada
    window.addEventListener('resize', applyResponsiveAdjustments);
    window.addEventListener('orientationchange', applyResponsiveAdjustments);
    
    // Fechar o menu ao clicar em um link (apenas em dispositivos móveis)
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show-mobile');
                mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
                
                // Remover overlay
                const overlay = document.getElementById('sidebar-overlay');
                if (overlay) overlay.remove();
            }
        });
    });
});

// Função para exibir modal de confirmação elegante
function showConfirmDialog(title, message, confirmCallback, type = 'default') {
    // Criar o modal de confirmação
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    
    // Criar a caixa de confirmação
    const confirmBox = document.createElement('div');
    confirmBox.className = 'confirm-box';
    
    // Ícone com base no tipo
    let icon = 'question-circle';
    if (type === 'delete') icon = 'trash-alt';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    // Cabeçalho
    const header = document.createElement('div');
    header.className = 'confirm-header';
    header.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <h3>${title}</h3>
    `;
    
    // Conteúdo
    const body = document.createElement('div');
    body.className = 'confirm-body';
    body.innerHTML = message;
    
    // Rodapé com botões
    const footer = document.createElement('div');
    footer.className = 'confirm-footer';
    
    // Botão Cancelar
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel-action';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = () => {
        document.body.removeChild(modal);
    };
    
    // Botão Confirmar
    const confirmBtn = document.createElement('button');
    confirmBtn.className = type === 'delete' ? 'btn-confirm-action delete' : 'btn-confirm-action';
    confirmBtn.textContent = type === 'delete' ? 'Excluir' : 'Confirmar';
    confirmBtn.onclick = () => {
        document.body.removeChild(modal);
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    };
    
    // Montar o modal
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    
    confirmBox.appendChild(header);
    confirmBox.appendChild(body);
    confirmBox.appendChild(footer);
    
    modal.appendChild(confirmBox);
    document.body.appendChild(modal);
    
    // Focar no botão Cancelar por segurança
    cancelBtn.focus();
}

// Função para converter a categoria da tarefa em texto legível
function getTaskPeriodText(category) {
    const periodTexts = {
        day: 'Dia',
        week: 'Semana',
        month: 'Mês',
        year: 'Ano'
    };
    
    return periodTexts[category] || category;
}

// Função para detectar tipo e modelo de dispositivo
function detectDeviceType() {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /(iPad|tablet|Tablet|PlayBook)|(Android(?!.*Mobile))/i.test(ua);
    const isIPad = /iPad/i.test(ua) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !window.MSStream);
    
    // Detectar iPhone modelo X ou superior (com notch)
    const isIPhoneX = /iPhone/i.test(ua) && 
                      (window.screen.height >= 812 || window.screen.width >= 812);
    
    return {
        mobile: isMobile && !isTablet,
        tablet: isTablet,
        iPad: isIPad,
        iPhoneX: isIPhoneX
    };
}

// Função para otimizar layout por dispositivo
function optimizeLayoutForDevice() {
    const device = detectDeviceType();
    const htmlElement = document.documentElement;
    
    // Adicionar classes ao HTML para CSS específico de dispositivo
    if (device.mobile) htmlElement.classList.add('device-mobile');
    if (device.tablet) htmlElement.classList.add('device-tablet');
    if (device.iPad) htmlElement.classList.add('device-ipad');
    if (device.iPhoneX) htmlElement.classList.add('device-iphonex');
    
    // Ajustes específicos para iPad
    if (device.iPad) {
        // Ajustar espaçamento para melhor uso do espaço em tela
        document.querySelectorAll('.task-list').forEach(el => {
            el.style.maxHeight = '500px';
        });
        
        // Ativar layout de duas colunas no modo paisagem para iPad
        window.addEventListener('orientationchange', adjustIPadLayout);
        adjustIPadLayout();
    }
    
    // Ajustes específicos para iPhone X e modelos com notch
    if (device.iPhoneX) {
        document.body.classList.add('has-notch');
        
        // Adicionar padding seguro nas áreas afetadas pelo notch e barras de sistema
        const safeAreaStyle = document.createElement('style');
        safeAreaStyle.innerHTML = `
            .mobile-menu-toggle {
                top: env(safe-area-inset-top, 20px);
                left: env(safe-area-inset-left, 20px);
            }
            .sidebar {
                padding-top: env(safe-area-inset-top, 32px);
            }
            .main-header {
                padding-top: env(safe-area-inset-top, 16px);
            }
            .notification {
                bottom: env(safe-area-inset-bottom, 20px);
            }
        `;
        document.head.appendChild(safeAreaStyle);
    }
}

// Ajustar layout para iPads conforme orientação
function adjustIPadLayout() {
    if (window.orientation === 90 || window.orientation === -90) {
        // Modo paisagem - duas colunas
        document.body.classList.add('ipad-landscape');
        document.body.classList.remove('ipad-portrait');
        
        // Ajustar layout de colunas no modo paisagem
        const taskColumns = document.querySelector('.task-columns');
        if (taskColumns) {
            taskColumns.style.gridTemplateColumns = 'repeat(auto-fit, minmax(350px, 1fr))';
        }
    } else {
        // Modo retrato - uma coluna
        document.body.classList.add('ipad-portrait');
        document.body.classList.remove('ipad-landscape');
        
        // Ajustar para layout vertical no modo retrato
        const taskColumns = document.querySelector('.task-columns');
        if (taskColumns) {
            taskColumns.style.gridTemplateColumns = 'minmax(280px, 1fr)';
        }
    }
}

// Inicializar otimização de layout para dispositivos
document.addEventListener('DOMContentLoaded', function() {
    // Chamar após carregar o DOM
    optimizeLayoutForDevice();
    
    // Adicionar evento de orientação
    window.addEventListener('orientationchange', function() {
        // Pequeno delay para garantir que as dimensões da janela estejam atualizadas
        setTimeout(function() {
            applyResponsiveAdjustments();
        }, 100);
    });
});
