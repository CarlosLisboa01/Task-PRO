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

// Carregar tarefas do localStorage
let tasks = JSON.parse(localStorage.getItem('tasks')) || {
    day: [],
    week: [],
    month: [],
    year: []
};

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

// Função para salvar tarefas no localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
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
function updateTasksStatus() {
    let updated = false;
    Object.keys(tasks).forEach(category => {
        tasks[category].forEach(task => {
            if (task.status !== 'completed' && task.status !== 'finished') {
                const wasLate = task.status === 'late';
                const isLate = isTaskLate(task);
                const inProgress = isTaskInProgress(task);
                
                if (isLate && !wasLate) {
                    task.status = 'late';
                    updated = true;
                } else if (inProgress && task.status !== 'pending') {
                    task.status = 'pending';
                    updated = true;
                }
            }
        });
    });
    if (updated) {
        saveTasks();
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
        
        sortedTasks.forEach((task, index) => {
            // Encontrar o índice correto na matriz original
            const originalIndex = tasks[category].findIndex(t => 
                t.text === task.text && 
                t.startDate === task.startDate && 
                t.endDate === task.endDate
            );
            
            const { taskElement, statusSelect, pinButton, deleteButton } = createTaskElement(task);
            
            // Evento para atualizar status
            statusSelect.addEventListener('change', (e) => {
                const newStatus = e.target.value;
                tasks[category][originalIndex].status = newStatus;
                
                // Atualizar classe do elemento da tarefa
                taskElement.className = `task-item status-${newStatus}`;
                if (task.pinned) {
                    taskElement.classList.add('pinned');
                }
                
                // Atualizar classe do select
                statusSelect.className = `status-${newStatus}`;
                
                saveTasks();
            });
            
            // Evento para fixar/desafixar tarefa
            pinButton.addEventListener('click', () => {
                tasks[category][originalIndex].pinned = !tasks[category][originalIndex].pinned;
                saveTasks();
                renderTasks(); // Re-renderizar para atualizar a ordem
            });
            
            // Evento para deletar tarefa
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                taskElement.style.opacity = '0';
                taskElement.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    tasks[category].splice(originalIndex, 1);
                    renderTasks();
                    saveTasks();
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
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const text = taskInput.value.trim();
    const category = taskCategory.value;
    const startDate = taskStartDate.value;
    const endDate = taskEndDate.value;
    
    // Verificar se todos os campos estão preenchidos
    if (!text || !startDate || !endDate) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            Todos os campos são obrigatórios
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 3000);
        }, 3000);
        return;
    }
    
    const status = document.querySelector('input[name="status"]:checked').value;
    
    if (!validateDates(startDate, endDate)) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            A data/hora final deve ser posterior à data/hora inicial
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 3000);
        }, 3000);
        return;
    }
    
    if (text && startDate && endDate) {
        tasks[category].push({
            text,
            startDate,
            endDate,
            status,
            pinned: false,
            createdAt: new Date().toISOString()
        });
        
        saveTasks();
        renderTasks();
        showSuccessNotification(`Tarefa adicionada com sucesso!`);
    }
});

// Verificar status das tarefas periodicamente
setInterval(updateTasksStatus, 1000 * 60); // Atualiza a cada minuto

// Adicionar estilos CSS para notificações e tema escuro
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
    
    .notification i {
        font-size: 20px;
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

// Renderizar tarefas ao carregar a página
renderTasks();

// Melhorar o feedback após adicionar uma tarefa
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