// Funções de Calendário para o TaskPro
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let calendarTasks = {};

// Função para inicializar o calendário
function initCalendar() {
    // Selecionar o container do calendário
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) return;
    
    // Botões de navegação do calendário
    const calendarControls = document.createElement('div');
    calendarControls.className = 'calendar-controls';
    calendarControls.innerHTML = `
        <div class="calendar-nav-group">
            <button id="prev-month" class="calendar-nav-btn">
                <i class="fas fa-chevron-left"></i>
                Anterior
            </button>
            <button id="today-btn" class="calendar-today-btn">
                <i class="fas fa-calendar-day"></i>
                Hoje
            </button>
            <button id="next-month" class="calendar-nav-btn">
                Próximo
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <h2 id="calendar-month-year">Mês Ano</h2>
    `;
    calendarContainer.appendChild(calendarControls);
    
    // Criar grid do calendário
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';
    calendarGrid.id = 'calendar-grid';
    calendarContainer.appendChild(calendarGrid);
    
    // Adicionar listeners aos botões de navegação
    document.getElementById('prev-month').addEventListener('click', () => {
        navigateMonth(-1);
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        navigateMonth(1);
    });
    
    document.getElementById('today-btn').addEventListener('click', () => {
        currentMonth = new Date().getMonth();
        currentYear = new Date().getFullYear();
        renderCalendar();
    });
    
    // Renderizar o calendário inicial
    renderCalendar();
}

// Função para navegar entre os meses
function navigateMonth(direction) {
    currentMonth += direction;
    
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    
    renderCalendar();
}

// Função para renderizar o calendário
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearElement = document.getElementById('calendar-month-year');
    
    if (!calendarGrid || !monthYearElement) return;
    
    // Limpar grid do calendário
    calendarGrid.innerHTML = '';
    
    // Atualizar título do mês/ano
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    monthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Adicionar cabeçalhos dos dias da semana
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekdays.forEach((day, index) => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-header';
        
        // Adicionar classe especial para finais de semana
        if (index === 0 || index === 6) {
            dayHeader.classList.add('calendar-weekend');
        }
        
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Calcular o primeiro e último dia do mês
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Adicionar células vazias para os dias anteriores ao primeiro dia do mês
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell calendar-empty';
        calendarGrid.appendChild(emptyCell);
    }
    
    // Remover qualquer tooltip existente
    const existingTooltip = document.getElementById('task-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Criar elemento de tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'task-tooltip';
    tooltip.className = 'task-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    
    // Adicionar células para cada dia do mês
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateCell = document.createElement('div');
        dateCell.className = 'calendar-cell';
        
        // Verificar se é hoje
        const today = new Date();
        if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dateCell.classList.add('calendar-today');
        }
        
        // Formato da data: YYYY-MM-DD
        const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Criar cabeçalho da célula com número do dia e indicador de tarefas
        const cellHeader = document.createElement('div');
        cellHeader.className = 'calendar-cell-header';
        
        // Adicionar número do dia
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;

        // Adicionar indicador de "Hoje" junto ao número do dia
        if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            const todayIndicator = document.createElement('span');
            todayIndicator.className = 'today-indicator';
            todayIndicator.textContent = 'Hoje';
            dayNumber.appendChild(todayIndicator);
        }

        cellHeader.appendChild(dayNumber);
        
        // Adicionar indicador de tarefas se houver tarefas neste dia
        if (calendarTasks[formattedDate] && calendarTasks[formattedDate].length > 0) {
            const taskCount = calendarTasks[formattedDate].length;
            const taskIndicator = document.createElement('div');
            taskIndicator.className = 'calendar-task-indicator';
            taskIndicator.innerHTML = `
                <span>${taskCount}</span>
                <i class="fas fa-tasks"></i>
            `;
            cellHeader.appendChild(taskIndicator);
        }
        
        dateCell.appendChild(cellHeader);
        
        // Adicionar container para tarefas
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'calendar-tasks-container';
        
        // Adicionar tarefas para esta data
        if (calendarTasks[formattedDate]) {
            calendarTasks[formattedDate].forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = `calendar-task status-${task.status}`;
                taskElement.textContent = task.text;
                taskElement.title = task.text;
                
                // Adicionar evento de mouseover para mostrar tooltip
                taskElement.addEventListener('mouseover', (e) => {
                    showTaskTooltip(e, task, tooltip);
                });
                
                // Adicionar evento de mouseout para esconder tooltip
                taskElement.addEventListener('mouseout', () => {
                    hideTaskTooltip(tooltip);
                });
                
                // Adicionar evento de clique para abrir modal de comentários
                taskElement.addEventListener('click', (e) => {
                    e.stopPropagation(); // Evitar que o clique propague para a célula
                    openCommentsModal(task.id);
                });
                
                tasksContainer.appendChild(taskElement);
            });
            
            // Verificar se o contêiner de tarefas precisa do indicador de "mais tarefas"
            // Agendar esta verificação após a renderização para garantir que as alturas estejam disponíveis
            setTimeout(() => {
                // Verificar se o contêiner tem scroll
                if (tasksContainer.scrollHeight > tasksContainer.clientHeight) {
                    tasksContainer.classList.add('has-more');
                    
                    // Adicionar botão "Ver todas"
                    const viewAllBtn = document.createElement('button');
                    viewAllBtn.className = 'view-all-tasks-btn';
                    viewAllBtn.innerHTML = `<i class="fas fa-chevron-down"></i> Ver todas ${calendarTasks[formattedDate].length} tarefas`;
                    viewAllBtn.type = "button"; // Especificar que é um botão
                    
                    // Garantir que o clique na célula não se sobreponha ao clique no botão
                    viewAllBtn.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Botão Ver todas clicado'); // Log para debugging
                        
                        // Expandir o contêiner e tornar todas as tarefas visíveis
                        tasksContainer.style.maxHeight = `${tasksContainer.scrollHeight + 20}px`;
                        
                        // Ocultar o botão após clicar
                        this.style.display = 'none';
                        
                        // Adicionar classe para indicar expansão
                        dateCell.classList.add('expanded-cell');
                        
                        // Criar botão para fechar a visualização expandida
                        const closeViewBtn = document.createElement('button');
                        closeViewBtn.className = 'close-expanded-view-btn';
                        closeViewBtn.innerHTML = `<i class="fas fa-chevron-up"></i> Fechar`;
                        closeViewBtn.type = "button"; // Especificar que é um botão
                        
                        // Adicionar evento para fechar a visualização expandida
                        closeViewBtn.onclick = function(evt) {
                            evt.preventDefault();
                            evt.stopPropagation();
                            console.log('Botão Fechar clicado'); // Log para debugging
                            
                            // Restaurar altura padrão
                            tasksContainer.style.maxHeight = '';
                            
                            // Remover classe de expansão
                            dateCell.classList.remove('expanded-cell');
                            
                            // Mostrar novamente o botão "Ver todas"
                            viewAllBtn.style.display = 'flex';
                            
                            // Remover o botão de fechar
                            this.remove();
                        };
                        
                        // Adicionar botão de fechar à célula
                        dateCell.appendChild(closeViewBtn);
                        
                        return false; // Impedir qualquer outro comportamento padrão
                    };
                    
                    // Remover o listener de eventos anterior, se existir
                    viewAllBtn.removeEventListener('click', () => {});
                    
                    // Inserir botão após o contêiner de tarefas
                    dateCell.insertBefore(viewAllBtn, tasksContainer.nextSibling);
                    
                    // Garantir que o botão seja visível e realmente clicável
                    viewAllBtn.style.display = 'flex';
                    viewAllBtn.style.pointerEvents = 'auto';
                    viewAllBtn.style.cursor = 'pointer';
                }
            }, 100);
        }
        
        dateCell.appendChild(tasksContainer);
        
        // Adicionar evento de clique na célula para abrir o modal de nova tarefa com data pré-preenchida
        dateCell.addEventListener('click', () => {
            // Criar hora atual formatada (HH:MM)
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const currentTime = `${hours}:${minutes}`;
            
            // Criar data formatada para o input datetime-local (YYYY-MM-DDTHH:MM)
            const selectedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${currentTime}`;
            
            // Preparar para nova tarefa
            prepareNewTask();
            
            // Preencher o campo de data de início
            setTimeout(() => {
                const taskStartDate = document.getElementById('task-start-date');
                if (taskStartDate) {
                    taskStartDate.value = selectedDate;
                    
                    // Disparar evento change para atualizar validação
                    const changeEvent = new Event('change');
                    taskStartDate.dispatchEvent(changeEvent);
                }
            }, 100);
        });
        
        calendarGrid.appendChild(dateCell);
    }
    
    // Adicionar listener de redimensionamento para recalcular os indicadores "has-more"
    window.addEventListener('resize', function() {
        // Rechecar todos os contêineres de tarefas após o redimensionamento
        const taskContainers = document.querySelectorAll('.calendar-tasks-container');
        taskContainers.forEach(container => {
            container.classList.remove('has-more');
            if (container.scrollHeight > container.clientHeight) {
                container.classList.add('has-more');
            }
        });
    });
}

// Função para mostrar tooltip com detalhes da tarefa
function showTaskTooltip(event, task, tooltipElement) {
    // Obter status em português
    const statusLabels = {
        'pending': 'Em andamento',
        'completed': 'Concluído',
        'finished': 'Finalizado',
        'late': 'Em atraso'
    };
    
    // Obter categoria em português
    const categoryLabels = {
        'day': 'Dia',
        'week': 'Semana',
        'month': 'Mês',
        'year': 'Ano'
    };
    
    // Formatar conteúdo do tooltip
    const tooltipContent = `
        <div class="tooltip-header">
            <h3>${task.text}</h3>
        </div>
        <div class="tooltip-body">
            <div class="tooltip-info">
                <i class="fas fa-layer-group"></i> 
                <span>Categoria: ${categoryLabels[task.category] || task.category}</span>
            </div>
            <div class="tooltip-info">
                <i class="fas fa-info-circle"></i> 
                <span>Status: ${statusLabels[task.status] || task.status}</span>
            </div>
            <div class="tooltip-info">
                <i class="fas fa-hourglass-start"></i> 
                <span>Início: ${formatDateTime(task.startDate)}</span>
            </div>
            <div class="tooltip-info">
                <i class="fas fa-hourglass-end"></i> 
                <span>Término: ${formatDateTime(task.endDate)}</span>
            </div>
        </div>
        <div class="tooltip-footer">
            <span>Clique para ver comentários</span>
        </div>
    `;
    
    // Atualizar conteúdo do tooltip
    tooltipElement.innerHTML = tooltipContent;
    tooltipElement.className = `task-tooltip status-${task.status}`;
    
    // Configurar variáveis para posicionamento da seta direcional
    let arrowStyle = '';
    let tooltipPosition = '';

    // Melhorar o posicionamento usando o elemento de origem em vez da posição do mouse
    const taskRect = event.currentTarget.getBoundingClientRect();
    
    // Dimensões do tooltip (valores aproximados)
    const tooltipWidth = 280;
    const tooltipHeight = 180;
    
    // Dimensões e posição da janela
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Por padrão, tenta posicionar à direita do elemento
    let left = taskRect.right + 15; // 15px à direita do elemento
    let top = taskRect.top - 10; // Alinhado com o topo do elemento
    tooltipPosition = 'right';
    
    // Verificar se o tooltip ultrapassa a borda direita da janela
    if (left + tooltipWidth > windowWidth - 20) {
        // Se não couber à direita, tenta à esquerda
        left = taskRect.left - tooltipWidth - 15;
        tooltipPosition = 'left';
        
        // Se ainda estiver fora da tela à esquerda, posiciona embaixo
        if (left < 20) {
            left = Math.max(20, taskRect.left);
            top = taskRect.bottom + 15;
            tooltipPosition = 'bottom';
            
            // Se não couber embaixo, posiciona em cima
            if (top + tooltipHeight > windowHeight - 20) {
                top = taskRect.top - tooltipHeight - 15;
                tooltipPosition = 'top';
            }
        }
    }
    
    // Verifica se precisa ajustar a posição vertical para garantir visibilidade
    if (tooltipPosition === 'right' || tooltipPosition === 'left') {
        // Garantir que não ultrapasse o topo da tela
        if (top < 20) {
            top = 20;
        } 
        // Garantir que não ultrapasse o fundo da tela
        else if (top + tooltipHeight > windowHeight - 20) {
            top = windowHeight - tooltipHeight - 20;
        }
    }
    
    // Configurar a posição da seta direcional com base no posicionamento do tooltip
    switch (tooltipPosition) {
        case 'right':
            arrowStyle = `
                left: -6px;
                top: ${taskRect.top + taskRect.height/2 - top}px;
                transform: rotate(45deg);
                border-right: none;
                border-top: none;
            `;
            break;
        case 'left':
            arrowStyle = `
                right: -6px;
                top: ${taskRect.top + taskRect.height/2 - top}px;
                transform: rotate(45deg);
                border-left: none;
                border-bottom: none;
            `;
            break;
        case 'top':
            arrowStyle = `
                bottom: -6px;
                left: ${taskRect.left + taskRect.width/2 - left}px;
                transform: rotate(45deg);
                border-top: none;
                border-left: none;
            `;
            break;
        case 'bottom':
            arrowStyle = `
                top: -6px;
                left: ${taskRect.left + taskRect.width/2 - left}px;
                transform: rotate(45deg);
                border-bottom: none;
                border-right: none;
            `;
            break;
    }
    
    // Aplicar posição ao tooltip
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
    
    // Adicionar seta direcional ao tooltip
    const arrowElement = document.createElement('div');
    arrowElement.className = 'tooltip-arrow';
    arrowElement.style.cssText = arrowStyle;
    tooltipElement.appendChild(arrowElement);
    
    // Melhorar visualização com animação suave
    tooltipElement.style.display = 'block';
    
    // Atrasar ligeiramente para garantir que a exibição seja suave
    requestAnimationFrame(() => {
        tooltipElement.style.opacity = '1';
        tooltipElement.style.transform = 'translateY(0)';
    });
}

// Função para esconder tooltip
function hideTaskTooltip(tooltipElement) {
    tooltipElement.style.opacity = '0';
    tooltipElement.style.transform = 'translateY(5px)';
    
    // Esconder completamente após a animação terminar
    setTimeout(() => {
        tooltipElement.style.display = 'none';
    }, 200);
}

// Função para carregar tarefas no calendário
async function loadCalendarTasks() {
    try {
        // Obter todas as tarefas (usando a função fetchTasks do supabase-config.js)
        const tasks = await fetchTasks();
        
        // Organizar tarefas por data
        calendarTasks = {};
        
        // Processar cada categoria de tarefas
        Object.keys(tasks).forEach(category => {
            tasks[category].forEach(task => {
                // Usar a data de início da tarefa como data do calendário
                const startDate = new Date(task.startDate);
                
                // Formato da data: YYYY-MM-DD
                const formattedDate = startDate.toISOString().split('T')[0];
                
                if (!calendarTasks[formattedDate]) {
                    calendarTasks[formattedDate] = [];
                }
                
                calendarTasks[formattedDate].push(task);
            });
        });
        
        // Renderizar calendário com as tarefas
        renderCalendar();
        
        // Atualizar a página de análises, se estiver inicializada
        if (typeof updateAnalytics === 'function') {
            updateAnalytics();
        }
    } catch (error) {
        console.error('Erro ao carregar tarefas para o calendário:', error);
    }
}

// Escutar eventos de navegação para a página de calendário
document.addEventListener('DOMContentLoaded', () => {
    // O gerenciamento de navegação foi movido para script.js na função setupNavigation()
    // para centralizar o controle de todos os links de navegação
});