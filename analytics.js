// Funções para a página de Análises do TaskPro
let analyticsInitialized = false;
let chartsInstances = {};

// Função para inicializar os gráficos e análises
function initAnalytics() {
    // Só inicializa uma vez para evitar duplicação
    if (analyticsInitialized) return;
    
    console.log('Inicializando Análises...');
    
    // Atualizar os valores de resumo
    updateSummaryValues();
    
    // Inicializar gráficos
    initTasksDistributionChart();
    initTasksEvolutionChart();
    initTasksByDayChart();
    initTasksByHourChart();
    
    // Configurar botões Ver Detalhes
    setupDetailButtons();
    
    // Configurar botão de exportação
    setupExportButton();
    
    analyticsInitialized = true;
}

// Função para obter todas as tarefas em um único array
function getAllTasks() {
    // Combina todas as tarefas das diferentes categorias
    return [
        ...tasks.day,
        ...tasks.week,
        ...tasks.month,
        ...tasks.year
    ];
}

// Função para atualizar os valores resumidos com dados reais
function updateSummaryValues() {
    const allTasks = getAllTasks();
    const totalTasks = allTasks.length;
    
    // Calcula a quantidade de tarefas por status
    const completedTasks = allTasks.filter(task => 
        task.status === 'completed' || task.status === 'finished'
    ).length;
    
    const lateTasks = allTasks.filter(task => 
        task.status === 'late'
    ).length;
    
    // Calcula o tempo médio de conclusão (para tarefas concluídas)
    let totalHours = 0;
    let countCompletedTasksWithTime = 0;
    
    allTasks.forEach(task => {
        if (task.status === 'completed' || task.status === 'finished') {
            const startDate = new Date(task.startDate);
            const endDate = new Date(task.endDate);
            const durationHours = (endDate - startDate) / (1000 * 60 * 60);
            
            if (!isNaN(durationHours) && durationHours > 0) {
                totalHours += durationHours;
                countCompletedTasksWithTime++;
            }
        }
    });
    
    const averageHours = countCompletedTasksWithTime > 0 
        ? (totalHours / countCompletedTasksWithTime).toFixed(1) 
        : '0';
    
    // Calcula as porcentagens
    const completedPercentage = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;
    
    const latePercentage = totalTasks > 0 
        ? Math.round((lateTasks / totalTasks) * 100) 
        : 0;
    
    // Atualiza os elementos no DOM
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks').textContent = `${completedPercentage}%`;
    document.getElementById('late-tasks').textContent = `${latePercentage}%`;
    document.getElementById('average-time').textContent = `${averageHours}h`;
}

// Função para inicializar o gráfico de pizza com a distribuição de tarefas
function initTasksDistributionChart() {
    const ctx = document.getElementById('tasks-distribution-chart').getContext('2d');
    
    // Destruir chart existente se houver
    if (chartsInstances.distribution) {
        chartsInstances.distribution.destroy();
    }
    
    // Obter dados reais para o gráfico
    const allTasks = getAllTasks();
    const pendingCount = allTasks.filter(task => task.status === 'pending').length;
    const completedCount = allTasks.filter(task => task.status === 'completed').length;
    const finishedCount = allTasks.filter(task => task.status === 'finished').length;
    const lateCount = allTasks.filter(task => task.status === 'late').length;
    
    // Total para cálculo de porcentagens
    const total = allTasks.length || 1; // Evitar divisão por zero
    
    // Dados em porcentagem
    const pendingPercentage = Math.round((pendingCount / total) * 100);
    const completedPercentage = Math.round((completedCount / total) * 100);
    const finishedPercentage = Math.round((finishedCount / total) * 100);
    const latePercentage = Math.round((lateCount / total) * 100);
    
    // Configuração do gráfico
    chartsInstances.distribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Em Andamento', 'Concluídas', 'Finalizadas', 'Atrasadas'],
            datasets: [{
                data: [pendingPercentage, completedPercentage, finishedPercentage, latePercentage],
                backgroundColor: [
                    '#eab308', // amarelo (pendente)
                    '#22c55e', // verde (concluído)
                    '#3b82f6', // azul (finalizado)
                    '#ef4444'  // vermelho (atrasado)
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            return `${label}: ${value}% (${
                                context.dataIndex === 0 ? pendingCount : 
                                context.dataIndex === 1 ? completedCount :
                                context.dataIndex === 2 ? finishedCount : lateCount
                            } tarefas)`;
                        }
                    }
                }
            }
        }
    });
}

// Função para agrupar tarefas por data
function groupTasksByDate(tasks, daysAgo = 7) {
    const result = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Inicializar todos os dias dos últimos 'daysAgo' dias com zero
    for (let i = daysAgo - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('pt-BR');
        result[dateStr] = 0;
    }
    
    // Contar tarefas concluídas/finalizadas por dia
    tasks.forEach(task => {
        if (task.status === 'completed' || task.status === 'finished') {
            // Usar a data de criação ou data final
            const taskDate = new Date(task.endDate);
            taskDate.setHours(0, 0, 0, 0);
            
            // Verificar se está dentro do período
            const diffTime = today - taskDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays < daysAgo) {
                const dateStr = taskDate.toLocaleDateString('pt-BR');
                result[dateStr] = (result[dateStr] || 0) + 1;
            }
        }
    });
    
    return result;
}

// Função para inicializar o gráfico de linha com a evolução das tarefas concluídas
function initTasksEvolutionChart() {
    const ctx = document.getElementById('tasks-evolution-chart').getContext('2d');
    
    // Destruir chart existente se houver
    if (chartsInstances.evolution) {
        chartsInstances.evolution.destroy();
    }
    
    // Obter dados reais para o gráfico
    const allTasks = getAllTasks();
    const tasksByDate = groupTasksByDate(allTasks, 7); // Últimos 7 dias
    
    // Preparar dados para o gráfico
    const labels = Object.keys(tasksByDate);
    const data = Object.values(tasksByDate);
    
    // Configuração do gráfico
    chartsInstances.evolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tarefas Concluídas',
                data: data,
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#7c3aed',
                pointRadius: 4,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Função para agrupar tarefas por dia da semana
function groupTasksByDayOfWeek(tasks) {
    const daysOfWeek = {
        'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0, 'Dom': 0
    };
    
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    tasks.forEach(task => {
        const taskDate = new Date(task.startDate);
        const dayOfWeek = dayNames[taskDate.getDay()];
        daysOfWeek[dayOfWeek] = (daysOfWeek[dayOfWeek] || 0) + 1;
    });
    
    // Reordenar os dias começando com segunda-feira
    return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => daysOfWeek[day]);
}

// Função para inicializar o gráfico de barras com tarefas por dia da semana
function initTasksByDayChart() {
    const ctx = document.getElementById('tasks-by-day-chart').getContext('2d');
    
    // Destruir chart existente se houver
    if (chartsInstances.byDay) {
        chartsInstances.byDay.destroy();
    }
    
    // Obter dados reais para o gráfico
    const allTasks = getAllTasks();
    const data = groupTasksByDayOfWeek(allTasks);
    
    // Configuração do gráfico
    chartsInstances.byDay = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Tarefas',
                data: data,
                backgroundColor: [
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(59, 130, 246, 0.7)'
                ],
                borderColor: [
                    '#7c3aed',
                    '#7c3aed',
                    '#7c3aed',
                    '#7c3aed',
                    '#7c3aed',
                    '#3b82f6',
                    '#3b82f6'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Função para agrupar tarefas por período do dia e dia da semana
function groupTasksByHourAndDay(tasks) {
    const periods = ['0h-6h', '6h-12h', '12h-18h', '18h-24h'];
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    
    // Inicializar resultado
    const result = {};
    days.forEach(day => {
        result[day] = [0, 0, 0, 0]; // Um valor para cada período
    });
    
    // Mapear número do dia da semana para nome
    const dayMap = {
        1: 'Segunda',
        2: 'Terça',
        3: 'Quarta',
        4: 'Quinta',
        5: 'Sexta'
    };
    
    tasks.forEach(task => {
        const taskDate = new Date(task.startDate);
        const dayOfWeek = taskDate.getDay(); // 0 = Domingo, 1 = Segunda, ...
        const hour = taskDate.getHours();
        
        // Só processar dias úteis
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const dayName = dayMap[dayOfWeek];
            
            // Determinar o período do dia
            let periodIndex;
            if (hour < 6) periodIndex = 0;
            else if (hour < 12) periodIndex = 1;
            else if (hour < 18) periodIndex = 2;
            else periodIndex = 3;
            
            // Incrementar contador
            result[dayName][periodIndex]++;
        }
    });
    
    // Converter para o formato de datasets do Chart.js
    return days.map((day, index) => {
        return {
            label: day,
            data: result[day],
            backgroundColor: `rgba(${124 - (index * 10)}, ${58 - (index * 5)}, ${237 - (index * 15)}, 0.7)`,
            borderColor: `rgb(${124 - (index * 10)}, ${58 - (index * 5)}, ${237 - (index * 15)})`,
            borderWidth: 1,
            borderRadius: 4
        };
    });
}

// Função para inicializar o gráfico de barras horizontais com distribuição por horário
function initTasksByHourChart() {
    const ctx = document.getElementById('tasks-by-hour-chart').getContext('2d');
    
    // Destruir chart existente se houver
    if (chartsInstances.byHour) {
        chartsInstances.byHour.destroy();
    }
    
    // Obter dados reais para o gráfico
    const allTasks = getAllTasks();
    const datasets = groupTasksByHourAndDay(allTasks);
    
    // Configuração do gráfico
    chartsInstances.byHour = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0h-6h', '6h-12h', '12h-18h', '18h-24h'],
            datasets: datasets
        },
        options: {
            indexAxis: 'y', // Barras horizontais
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        precision: 0,
                        stepSize: 1
                    }
                },
                y: {
                    stacked: true,
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Função para configurar botões de detalhes
function setupDetailButtons() {
    const detailButtons = document.querySelectorAll('.view-details-btn');
    
    detailButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Aqui poderíamos abrir um modal com detalhes mais aprofundados
            // Por enquanto, apenas exibe uma mensagem no console
            const chartType = this.closest('.analytics-card').querySelector('h3').textContent;
            console.log(`Detalhes solicitados para: ${chartType}`);
            
            // Adicionar um ícone de loading no botão temporariamente
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
            
            // Simular carregamento e restaurar o botão
            setTimeout(() => {
                this.innerHTML = originalText;
                alert(`Detalhes de "${chartType}" seriam exibidos aqui em um modal.`);
            }, 800);
        });
    });
}

// Função para configurar o botão de exportação
function setupExportButton() {
    const exportButton = document.querySelector('.export-btn');
    
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            // Preparar dados para exportação
            const allTasks = getAllTasks();
            const exportData = {
                resumo: {
                    total: allTasks.length,
                    concluidas: allTasks.filter(t => t.status === 'completed' || t.status === 'finished').length,
                    atrasadas: allTasks.filter(t => t.status === 'late').length,
                    emAndamento: allTasks.filter(t => t.status === 'pending').length
                },
                tarefasPorCategoria: {
                    dia: tasks.day.length,
                    semana: tasks.week.length,
                    mes: tasks.month.length,
                    ano: tasks.year.length
                },
                tarefasPorStatus: {
                    emAndamento: allTasks.filter(t => t.status === 'pending').length,
                    concluidas: allTasks.filter(t => t.status === 'completed').length,
                    finalizadas: allTasks.filter(t => t.status === 'finished').length,
                    atrasadas: allTasks.filter(t => t.status === 'late').length
                }
            };
            
            // Converter para JSON e criar blob para download
            const jsonData = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Criar link de download e clicar nele
            const a = document.createElement('a');
            a.href = url;
            a.download = `analise_tarefas_${new Date().toISOString().slice(0, 10)}.json`;
            
            // Adicionar um ícone de loading no botão temporariamente
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';
            
            setTimeout(() => {
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.innerHTML = originalText;
                showSuccessNotification('Dados exportados com sucesso!');
            }, 800);
        });
    }
}

// Função para atualizar os gráficos quando os dados mudarem
function updateAnalytics() {
    if (analyticsInitialized) {
        updateSummaryValues();
        initTasksDistributionChart();
        initTasksEvolutionChart();
        initTasksByDayChart();
        initTasksByHourChart();
    }
}

// Função para reagir a mudanças de tamanho da janela
window.addEventListener('resize', function() {
    // Reajustar gráficos quando a janela for redimensionada
    if (analyticsInitialized) {
        Object.values(chartsInstances).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
}); 