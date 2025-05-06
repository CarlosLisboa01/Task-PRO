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

// Configuração inicial
document.body.classList.add(localStorage.getItem('theme') || 'light');
const now = new Date();
const nowString = now.toISOString().slice(0, 16);

// Estado global das tarefas - será preenchido pelo Supabase
let tasks = {
    day: [],
    week: [],
    month: [],
    year: []
};

// Carregar tarefas do Supabase quando a página for carregada
document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar estado de carregamento
    showLoadingState();
    
    try {
        // Verificar conexão com Supabase
        const isConnected = await checkSupabaseConnection();
        
        if (!isConnected) {
            // Se não conseguir conectar ao Supabase, usar o localStorage como fallback
            tasks = JSON.parse(localStorage.getItem('tasks')) || {
                day: [],
                week: [],
                month: [],
                year: []
            };
            
            showErrorNotification('Não foi possível conectar ao Supabase. Usando armazenamento local.');
        } else {
            // Buscar tarefas do Supabase
            tasks = await fetchTasks();
        }
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        
        // Fallback para localStorage em caso de erro
        tasks = JSON.parse(localStorage.getItem('tasks')) || {
            day: [],
            week: [],
            month: [],
            year: []
        };
        
        showErrorNotification('Erro ao carregar tarefas. Usando armazenamento local.');
    } finally {
        // Ocultar estado de carregamento e renderizar tarefas
        hideLoadingState();
        renderTasks();
    }
});

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
    taskFormModal.style.display = 'flex';
    taskInput.focus();
    document.body.style.overflow = 'hidden';
    clearDateRestrictions();
}

function closeModal() {
    taskFormModal.style.display = 'none';
    taskForm.reset();
    document.body.style.overflow = '';
}

// Garantir que o modal comece fechado
taskFormModal.style.display = 'none';

// Ajuste para o fluxo de adição de tarefa - limpar todos os dados
function prepareNewTask() {
    // Limpar o formulário
    taskForm.reset();
    
    // Limpar restrições de data
    clearDateRestrictions();
    
    // Definir status padrão como pendente
    document.querySelector('input[name="status"][value="pending"]').checked = true;
    
    // Abrir o modal
    openModal();
}

// Substituir o listener direto por nossa função de preparação
newTaskBtn.removeEventListener('click', openModal);
newTaskBtn.addEventListener('click', prepareNewTask);

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
    // Sempre salvar no localStorage como fallback
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
    // Não precisa fazer nada no Supabase aqui, pois cada tarefa é salva individualmente
    // quando é criada, atualizada ou excluída
    
    updateTaskCounts();
}

// Função para atualizar contadores de tarefas
function updateTaskCounts() {
    Object.keys(tasks).forEach(category => {
        const count = tasks[category].length;
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
    
    return { taskElement, statusSelect, pinButton, deleteButton };
}

// Função para renderizar tarefas
function renderTasks() {
    Object.keys(tasks).forEach(category => {
        const taskList = document.querySelector(`#${category} .task-list`);
        taskList.innerHTML = '';
        
        if (tasks[category].length === 0) {
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
        const sortedTasks = [...tasks[category]].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });
        
        sortedTasks.forEach((task) => {
            const { taskElement, statusSelect, pinButton, deleteButton } = createTaskElement(task);
            
            // Evento para atualizar status
            statusSelect.addEventListener('change', async (e) => {
                const newStatus = e.target.value;
                
                // Atualizar no estado local
                const originalIndex = tasks[category].findIndex(t => t.id === task.id);
                if (originalIndex !== -1) {
                    tasks[category][originalIndex].status = newStatus;
                    
                    // Atualizar classe do elemento da tarefa
                    taskElement.className = `task-item status-${newStatus}`;
                    if (task.pinned) {
                        taskElement.classList.add('pinned');
                    }
                    
                    // Atualizar classe do select
                    statusSelect.className = `status-${newStatus}`;
                    
                    // Salvar no localStorage
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
                const originalIndex = tasks[category].findIndex(t => t.id === task.id);
                if (originalIndex !== -1) {
                    const newPinnedState = !tasks[category][originalIndex].pinned;
                    tasks[category][originalIndex].pinned = newPinnedState;
                    
                    // Salvar no localStorage
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
                    const originalIndex = tasks[category].findIndex(t => t.id === task.id);
                    if (originalIndex !== -1) {
                        // Remover do estado local
                        tasks[category].splice(originalIndex, 1);
                        
                        // Salvar no localStorage
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
                saveTasks(); // Salva no localStorage também
                renderTasks();
                showSuccessNotification('Tarefa adicionada com sucesso!');
            } else {
                // Se falhar no Supabase, ainda adiciona localmente, mas com aviso
                newTask.id = Date.now(); // Gerar ID temporário
                tasks[category].push(newTask);
                saveTasks();
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