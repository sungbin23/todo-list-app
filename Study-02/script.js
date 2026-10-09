const taskInput = document.getElementById('taskInput');
const categorySelect = document.getElementById('categorySelect');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const filterBtns = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('themeToggle');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const quoteContainer = document.getElementById('quoteContainer');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let currentSort = localStorage.getItem('currentSort') || 'latest';
sortSelect.value = currentSort;
const categoryNames = { work: '업무', personal: '개인', study: '공부' };

const quotes = [
    "작은 진전도 큰 성과입니다 🌟",
    "오늘 할 일을 내일로 미루지 말자 ⏰",
    "꾸준함이 탁월함을 만듭니다 💪",
    "시작이 반이다! 일단 시작해볼까요? 🚀",
    "당신의 하루를 스스로 디자인하세요 🎨"
];
quoteContainer.textContent = quotes[Math.floor(Math.random() * quotes.length)];

let isDarkMode = JSON.parse(localStorage.getItem('isDarkMode')) || false;
if (isDarkMode) document.body.classList.add('dark-mode');
themeToggle.textContent = isDarkMode ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
});

function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours >= 12 ? '오후' : '오전'} ${hours % 12 || 12}:${minutes}`;
}

function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById('overallText').textContent = `${completed}/${total} 완료 (${percent}%)`;
    document.getElementById('overallProgress').style.width = `${percent}%`;
    const today = new Date().toDateString();
    document.getElementById('todayCount').textContent = `${tasks.filter(t => new Date(t.createdAt).toDateString() === today).length}개`;

    ['work', 'personal', 'study'].forEach(cat => {
        const catTasks = tasks.filter(t => t.category === cat);
        const catPercent = catTasks.length === 0 ? 0 : (catTasks.filter(t => t.completed).length / catTasks.length) * 100;
        document.getElementById(`${cat}Text`).textContent = `${catTasks.filter(t => t.completed).length}/${catTasks.length}`;
        document.getElementById(`${cat}Progress`).style.width = `${catPercent}%`;
    });
}

function renderTasks() {
    taskList.innerHTML = ''; 
    const keyword = searchInput.value.toLowerCase();
    
    // 1. 필터 및 검색 적용
    let displayTasks = tasks.filter(task => {
        const matchesFilter = currentFilter === 'all' || task.category === currentFilter;
        const matchesSearch = task.text.toLowerCase().includes(keyword);
        return matchesFilter && matchesSearch;
    });

    // 2. 정렬 옵션 적용
    displayTasks.sort((a, b) => {
        if (currentSort === 'latest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (currentSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (currentSort === 'category') return a.category.localeCompare(b.category);
        if (currentSort === 'completed') return (a.completed === b.completed) ? 0 : a.completed ? 1 : -1;
    });

    if (displayTasks.length === 0) {
        taskList.innerHTML = '<li class="empty-message">할 일이 없습니다. 추가해보세요!</li>';
    } else {
        displayTasks.forEach((task) => {
            const originalIndex = tasks.indexOf(task); 
            const li = document.createElement('li');
            li.draggable = true; // 드래그 앤 드롭 활성화
            
            // 드래그 이벤트 설정
            li.addEventListener('dragstart', (e) => {
                li.classList.add('dragging');
                e.dataTransfer.setData('text/plain', originalIndex);
            });
            li.addEventListener('dragend', () => li.classList.remove('dragging'));
            li.addEventListener('dragover', e => e.preventDefault());
            li.addEventListener('drop', (e) => {
                e.preventDefault();
                const dragStartIndex = e.dataTransfer.getData('text/plain');
                if (dragStartIndex === '' || dragStartIndex == originalIndex) return;
                
                const draggedItem = tasks.splice(dragStartIndex, 1)[0];
                tasks.splice(originalIndex, 0, draggedItem);
                saveTasks();
                renderTasks();
            });

            if (task.completed) li.classList.add('completed');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleTask(originalIndex));

            const taskContent = document.createElement('div');
            taskContent.className = 'task-content';
            const span = document.createElement('span');
            span.className = 'task-text';
            span.textContent = task.text;
            span.addEventListener('dblclick', () => enableEditMode(li, task, originalIndex));

            const tag = document.createElement('span');
            tag.className = `category-tag tag-${task.category}`;
            tag.textContent = categoryNames[task.category];

            const timeSpan = document.createElement('span');
            timeSpan.className = 'time-text';
            timeSpan.textContent = getTimeAgo(task.createdAt);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = 'X';
            deleteBtn.addEventListener('click', () => deleteTask(originalIndex));

            taskContent.appendChild(span);
            taskContent.appendChild(tag);
            li.appendChild(checkbox);
            li.appendChild(taskContent);
            li.appendChild(timeSpan);
            li.appendChild(deleteBtn);
            taskList.appendChild(li);
        });
    }
    updateDashboard();
}

function enableEditMode(li, task, index) { 
    const taskContent = li.querySelector('.task-content');
    taskContent.innerHTML = ''; 
    const editInput = document.createElement('input');
    editInput.type = 'text'; editInput.value = task.text;
    editInput.className = 'edit-mode-input';
    
    const saveEdit = () => {
        if (editInput.value.trim()) tasks[index].text = editInput.value.trim();
        saveTasks(); renderTasks(); 
    };
    editInput.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter') saveEdit(); 
        if (e.key === 'Escape') renderTasks(); 
    });
    taskContent.appendChild(editInput);
    editInput.focus();
}

function saveTasks() { localStorage.setItem('tasks', JSON.stringify(tasks)); }

function addTask() {
    const text = taskInput.value.trim();
    if (text) {
        tasks.push({ text: text, completed: false, category: categorySelect.value, createdAt: new Date().toISOString() });
        taskInput.value = ''; saveTasks(); renderTasks();
    }
}

function toggleTask(index) { tasks[index].completed = !tasks[index].completed; saveTasks(); renderTasks(); }
function deleteTask(index) { tasks.splice(index, 1); saveTasks(); renderTasks(); }

// 정렬 변경 이벤트
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    localStorage.setItem('currentSort', currentSort);
    renderTasks();
});

// JSON 내보내기
exportBtn.addEventListener('click', () => {
    const exportData = { tasks, settings: { currentFilter, currentSort, isDarkMode }, metadata: { exportDate: new Date().toISOString(), taskCount: tasks.length } };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `my-tasks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    alert('데이터가 성공적으로 내보내졌습니다!');
});

// JSON 가져오기
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (confirm(`현재 ${tasks.length}개의 할 일이 있습니다. 가져오시겠습니까? (현재 데이터는 덮어씌워집니다)`)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.tasks) {
                    tasks = data.tasks;
                    saveTasks();
                    renderTasks();
                    alert('데이터를 성공적으로 불러왔습니다!');
                }
            } catch (error) {
                alert('파일 형식이 잘못되었습니다.');
            }
        };
        reader.readAsText(file);
    }
    importFile.value = ''; // 초기화
});

clearCompletedBtn.addEventListener('click', () => {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) return alert('삭제할 완료된 항목이 없습니다.');
    if (confirm(`완료된 할 일 ${completedCount}개를 모두 삭제하시겠습니까?`)) {
        tasks = tasks.filter(t => !t.completed);
        saveTasks(); renderTasks();
    }
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-filter');
        renderTasks();
    });
});

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
searchInput.addEventListener('input', renderTasks);

document.addEventListener('keydown', (e) => {
    if (e.altKey) {
        switch(e.key.toLowerCase()) {
            case 'n': e.preventDefault(); taskInput.focus(); break;
            case '1': document.querySelector('[data-filter="all"]').click(); break;
            case '2': document.querySelector('[data-filter="work"]').click(); break;
            case '3': document.querySelector('[data-filter="personal"]').click(); break;
            case '4': document.querySelector('[data-filter="study"]').click(); break;
        }
    }
});

renderTasks();