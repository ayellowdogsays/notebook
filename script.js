// 笔记本应用 - 主脚本文件
// 使用localStorage存储数据，纯前端实现

// 应用状态
const appState = {
    notes: [],
    currentNoteId: null,
    searchTerm: '',
    isDataChanged: false,
    lastAutoSave: null
};

// DOM元素缓存
const elements = {
    // 按钮
    newNoteBtn: document.getElementById('newNoteBtn'),
    saveNoteBtn: document.getElementById('saveNoteBtn'),
    deleteNoteBtn: document.getElementById('deleteNoteBtn'),
    exportBtn: document.getElementById('exportBtn'),
    
    // 输入框
    searchInput: document.getElementById('searchInput'),
    noteTitle: document.getElementById('noteTitle'),
    noteContent: document.getElementById('noteContent'),
    
    // 显示区域
    notesList: document.getElementById('notesList'),
    emptyNotes: document.getElementById('emptyNotes'),
    notesCount: document.getElementById('notesCount'),
    titleCharCount: document.getElementById('titleCharCount'),
    contentCharCount: document.getElementById('contentCharCount'),
    lastSavedTime: document.getElementById('lastSavedTime'),
    
    // 模态框相关
    exportModal: document.getElementById('exportModal'),
    exportData: document.getElementById('exportData'),
    importData: document.getElementById('importData'),
    importFile: document.getElementById('importFile'),
    fileName: document.getElementById('fileName'),
    copyExportBtn: document.getElementById('copyExportBtn'),
    downloadExportBtn: document.getElementById('downloadExportBtn'),
    importBtn: document.getElementById('importBtn'),
    modalClose: document.querySelector('.modal-close'),
    
    // 标签页
    modalTabs: document.querySelectorAll('.modal-tab'),
    
    // 提示
    toast: document.getElementById('toast')
};

// 初始化应用
function initApp() {
    loadNotes();
    setupEventListeners();
    updateCharCounters();
    
    // 设置自动保存
    setupAutoSave();
    
    // 初始渲染
    renderNotesList();
    
    // 如果存在笔记，选择第一个
    if (appState.notes.length > 0) {
        selectNote(appState.notes[0].id);
    } else {
        // 创建欢迎笔记
        createWelcomeNote();
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 新建笔记
    elements.newNoteBtn.addEventListener('click', createNewNote);
    
    // 保存笔记
    elements.saveNoteBtn.addEventListener('click', saveCurrentNote);
    
    // 删除笔记
    elements.deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    
    // 导出按钮
    elements.exportBtn.addEventListener('click', showExportModal);
    
    // 搜索笔记
    elements.searchInput.addEventListener('input', (e) => {
        appState.searchTerm = e.target.value.toLowerCase();
        renderNotesList();
    });
    
    // 标题输入
    elements.noteTitle.addEventListener('input', () => {
        updateCharCounters();
        appState.isDataChanged = true;
    });
    
    // 内容输入
    elements.noteContent.addEventListener('input', () => {
        updateCharCounters();
        appState.isDataChanged = true;
    });
    
    // 导入/导出模态框
    elements.modalClose.addEventListener('click', hideExportModal);
    elements.exportModal.addEventListener('click', (e) => {
        if (e.target === elements.exportModal) {
            hideExportModal();
        }
    });
    
    // 标签页切换
    elements.modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // 复制导出数据
    elements.copyExportBtn.addEventListener('click', copyExportData);
    
    // 下载导出数据
    elements.downloadExportBtn.addEventListener('click', downloadExportData);
    
    // 导入按钮
    elements.importBtn.addEventListener('click', importNotes);
    
    // 文件选择
    elements.importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            elements.fileName.textContent = file.name;
            readImportFile(file);
        }
    });
    
    // 拖放导入
    setupDragAndDrop();
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 离开页面提示
    window.addEventListener('beforeunload', handleBeforeUnload);
}

// 设置自动保存
function setupAutoSave() {
    setInterval(() => {
        if (appState.isDataChanged && appState.currentNoteId) {
            saveCurrentNote();
        }
    }, 3000); // 每3秒自动保存
}

// 更新字符计数器
function updateCharCounters() {
    const titleLength = elements.noteTitle.value.length;
    const contentLength = elements.noteContent.value.length;
    
    elements.titleCharCount.textContent = `${titleLength}/100`;
    elements.contentCharCount.textContent = `${contentLength} 字符`;
    
    // 标题长度警告
    if (titleLength >= 90) {
        elements.titleCharCount.style.color = 'var(--danger)';
    } else if (titleLength >= 80) {
        elements.titleCharCount.style.color = 'var(--warning)';
    } else {
        elements.titleCharCount.style.color = 'var(--text-light)';
    }
}

// 从localStorage加载笔记
function loadNotes() {
    try {
        const notesJson = localStorage.getItem('lightweightNotes');
        if (notesJson) {
            appState.notes = JSON.parse(notesJson);
            
            // 确保每个笔记都有必需的字段
            appState.notes = appState.notes.map(note => {
                return {
                    id: note.id || Date.now().toString(),
                    title: note.title || '无标题',
                    content: note.content || '',
                    createdAt: note.createdAt || new Date().toISOString(),
                    updatedAt: note.updatedAt || new Date().toISOString(),
                    tags: note.tags || []
                };
            });
        } else {
            appState.notes = [];
        }
    } catch (error) {
        console.error('加载笔记时出错:', error);
        appState.notes = [];
        showToast('加载笔记时出错，已重置数据', 'error');
    }
    
    updateNotesCount();
}

// 保存笔记到localStorage
function saveNotes() {
    try {
        localStorage.setItem('lightweightNotes', JSON.stringify(appState.notes));
        appState.isDataChanged = false;
        appState.lastAutoSave = new Date();
        
        // 更新最后保存时间显示
        if (elements.lastSavedTime) {
            const timeStr = appState.lastAutoSave.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            elements.lastSavedTime.textContent = `已保存 ${timeStr}`;
        }
        
        updateNotesCount();
        return true;
    } catch (error) {
        console.error('保存笔记时出错:', error);
        
        // 检查存储空间
        if (error.name === 'QuotaExceededError') {
            showToast('存储空间不足，请删除一些笔记', 'error');
        } else {
            showToast('保存失败，请重试', 'error');
        }
        
        return false;
    }
}

// 更新笔记计数
function updateNotesCount() {
    elements.notesCount.textContent = appState.notes.length;
    
    // 更新标题
    const count = appState.notes.length;
    document.title = count > 0 ? `(${count}) 轻量笔记本` : '轻量笔记本';
}

// 渲染笔记列表
function renderNotesList() {
    const notes = appState.notes;
    
    // 搜索过滤
    let filteredNotes = notes;
    if (appState.searchTerm) {
        filteredNotes = notes.filter(note => 
            note.title.toLowerCase().includes(appState.searchTerm) || 
            note.content.toLowerCase().includes(appState.searchTerm)
        );
    }
    
    // 按更新时间排序
    filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    if (filteredNotes.length === 0) {
        elements.emptyNotes.style.display = 'block';
        elements.notesList.innerHTML = '';
        elements.notesList.appendChild(elements.emptyNotes);
    } else {
        elements.emptyNotes.style.display = 'none';
        
        const notesHtml = filteredNotes.map(note => {
            const isActive = note.id === appState.currentNoteId ? 'active' : '';
            const preview = note.content.length > 100 
                ? note.content.substring(0, 100) + '...' 
                : note.content;
            
            const updatedAt = new Date(note.updatedAt);
            const now = new Date();
            const diffTime = Math.abs(now - updatedAt);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            let timeStr;
            if (diffDays === 0) {
                timeStr = updatedAt.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else if (diffDays === 1) {
                timeStr = '昨天';
            } else if (diffDays < 7) {
                timeStr = `${diffDays}天前`;
            } else {
                timeStr = updatedAt.toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric'
                });
            }
            
            return `
                <div class="note-item ${isActive}" data-note-id="${note.id}">
                    <div class="note-title">${escapeHtml(note.title)}</div>
                    <div class="note-preview">${escapeHtml(preview)}</div>
                    <div class="note-meta">
                        <div class="note-date">
                            <i class="far fa-clock"></i>
                            <span>${timeStr}</span>
                        </div>
                        <span>${note.content.length} 字</span>
                    </div>
                </div>
            `;
        }).join('');
        
        elements.notesList.innerHTML = notesHtml;
        
        // 为每个笔记项添加点击事件
        document.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.getAttribute('data-note-id');
                selectNote(noteId);
            });
        });
    }
}

// 创建欢迎笔记
function createWelcomeNote() {
    const welcomeNote = {
        id: Date.now().toString(),
        title: '欢迎使用轻量笔记本',
        content: '这是一个基于浏览器本地存储的轻量笔记本应用。\n\n## 功能特性\n\n✅ 完全离线使用，数据存储在您的浏览器中\n✅ 自动保存功能，无需手动保存\n✅ 支持搜索和筛选笔记\n✅ 可导入导出数据备份\n✅ 响应式设计，支持手机和电脑\n\n## 使用方法\n\n1. 点击"新建笔记"创建新笔记\n2. 在右侧编辑笔记内容\n3. 自动保存，无需担心数据丢失\n4. 使用搜索框快速查找笔记\n5. 通过导入/导出功能备份数据\n\n祝您使用愉快！',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['欢迎']
    };
    
    appState.notes.push(welcomeNote);
    saveNotes();
    selectNote(welcomeNote.id);
    showToast('欢迎使用轻量笔记本！', 'success');
}

// 创建新笔记
function createNewNote() {
    const newNote = {
        id: Date.now().toString(),
        title: '新笔记',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
    };
    
    appState.notes.unshift(newNote);
    saveNotes();
    selectNote(newNote.id);
    
    // 清空搜索框
    elements.searchInput.value = '';
    appState.searchTerm = '';
    
    // 聚焦到标题输入框
    setTimeout(() => {
        elements.noteTitle.focus();
        elements.noteTitle.select();
    }, 100);
    
    showToast('已创建新笔记', 'success');
}

// 选择笔记
function selectNote(noteId) {
    appState.currentNoteId = noteId;
    const note = appState.notes.find(n => n.id === noteId);
    
    if (note) {
        elements.noteTitle.value = note.title;
        elements.noteContent.value = note.content;
        elements.deleteNoteBtn.disabled = false;
        appState.isDataChanged = false;
    } else {
        clearEditor();
    }
    
    updateCharCounters();
    renderNotesList();
}

// 保存当前笔记
function saveCurrentNote() {
    if (!appState.currentNoteId) {
        showToast('请先选择或创建笔记', 'error');
        return false;
    }
    
    const noteIndex = appState.notes.findIndex(n => n.id === appState.currentNoteId);
    
    if (noteIndex === -1) {
        showToast('笔记不存在', 'error');
        return false;
    }
    
    const title = elements.noteTitle.value.trim() || '无标题';
    const content = elements.noteContent.value;
    
    appState.notes[noteIndex].title = title;
    appState.notes[noteIndex].content = content;
    appState.notes[noteIndex].updatedAt = new Date().toISOString();
    
    if (saveNotes()) {
        showToast('笔记已保存', 'success');
        return true;
    }
    
    return false;
}

// 删除当前笔记
function deleteCurrentNote() {
    if (!appState.currentNoteId) {
        showToast('没有可删除的笔记', 'error');
        return;
    }
    
    if (!confirm('确定要删除此笔记吗？此操作不可撤销。')) {
        return;
    }
    
    const noteIndex = appState.notes.findIndex(n => n.id === appState.currentNoteId);
    
    if (noteIndex === -1) {
        showToast('笔记不存在', 'error');
        return;
    }
    
    const noteTitle = appState.notes[noteIndex].title;
    appState.notes.splice(noteIndex, 1);
    saveNotes();
    
    // 选择另一个笔记或清空编辑器
    if (appState.notes.length > 0) {
        selectNote(appState.notes[0].id);
    } else {
        clearEditor();
    }
    
    showToast(`已删除笔记: ${noteTitle}`, 'success');
}

// 清空编辑器
function clearEditor() {
    elements.noteTitle.value = '';
    elements.noteContent.value = '';
    appState.currentNoteId = null;
    elements.deleteNoteBtn.disabled = true;
    appState.isDataChanged = false;
    updateCharCounters();
}

// 显示导出模态框
function showExportModal() {
    // 切换到导出标签页
    switchTab('export');
    
    // 生成导出数据
    const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        noteCount: appState.notes.length,
        notes: appState.notes
    };
    
    elements.exportData.value = JSON.stringify(exportData, null, 2);
    elements.exportModal.classList.add('show');
    
    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
}

// 隐藏导出模态框
function hideExportModal() {
    elements.exportModal.classList.remove('show');
    document.body.style.overflow = '';
}

// 切换标签页
function switchTab(tabName) {
    // 更新标签页按钮状态
    elements.modalTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 更新标签页内容
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        if (content.id === `${tabName}Tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // 清空导入数据
    if (tabName === 'import') {
        elements.importData.value = '';
        elements.importFile.value = '';
        elements.fileName.textContent = '未选择文件';
    }
}

// 复制导出数据
function copyExportData() {
    if (!elements.exportData.value) {
        showToast('没有可复制的数据', 'error');
        return;
    }
    
    navigator.clipboard.writeText(elements.exportData.value)
        .then(() => {
            showToast('已复制到剪贴板', 'success');
        })
        .catch(err => {
            console.error('复制失败:', err);
            showToast('复制失败，请手动复制', 'error');
        });
}

// 下载导出数据
function downloadExportData() {
    if (!elements.exportData.value) {
        showToast('没有可下载的数据', 'error');
        return;
    }
    
    const dataStr = elements.exportData.value;
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `笔记本备份_${dateStr}.json`;
    link.href = url;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showToast('下载成功', 'success');
}

// 读取导入文件
function readImportFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            elements.importData.value = e.target.result;
        } catch (error) {
            showToast('读取文件失败', 'error');
        }
    };
    
    reader.onerror = function() {
        showToast('读取文件失败', 'error');
    };
    
    reader.readAsText(file);
}

// 设置拖放导入
function setupDragAndDrop() {
    const importArea = elements.importData;
    
    importArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        importArea.style.borderColor = 'var(--primary)';
        importArea.style.backgroundColor = 'var(--primary-transparent)';
    });
    
    importArea.addEventListener('dragleave', () => {
        importArea.style.borderColor = '';
        importArea.style.backgroundColor = '';
    });
    
    importArea.addEventListener('drop', (e) => {
        e.preventDefault();
        importArea.style.borderColor = '';
        importArea.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
                elements.fileName.textContent = file.name;
                readImportFile(file);
            } else {
                showToast('请拖放JSON或文本文件', 'error');
            }
        }
    });
}

// 导入笔记
function importNotes() {
    const importText = elements.importData.value.trim();
    
    if (!importText) {
        showToast('请输入要导入的数据', 'error');
        return;
    }
    
    try {
        const importedData = JSON.parse(importText);
        
        // 验证导入数据格式
        if (!importedData.notes || !Array.isArray(importedData.notes)) {
            showToast('导入数据格式不正确', 'error');
            return;
        }
        
        // 确认是否覆盖现有数据
        if (appState.notes.length > 0) {
            if (!confirm('导入将添加新笔记，是否继续？')) {
                return;
            }
        }
        
        // 处理导入的笔记
        let importedCount = 0;
        const now = new Date().toISOString();
        
        importedData.notes.forEach(importedNote => {
            // 检查是否已存在相同ID的笔记
            const existingIndex = appState.notes.findIndex(n => n.id === importedNote.id);
            
            if (existingIndex >= 0) {
                // 更新现有笔记
                appState.notes[existingIndex] = {
                    ...importedNote,
                    updatedAt: now
                };
            } else {
                // 添加新笔记
                appState.notes.push({
                    id: importedNote.id || Date.now().toString(),
                    title: importedNote.title || '导入的笔记',
                    content: importedNote.content || '',
                    createdAt: importedNote.createdAt || now,
                    updatedAt: importedNote.updatedAt || now,
                    tags: importedNote.tags || []
                });
            }
            
            importedCount++;
        });
        
        // 保存并刷新
        saveNotes();
        renderNotesList();
        
        // 显示结果
        hideExportModal();
        showToast(`成功导入 ${importedCount} 条笔记`, 'success');
        
        // 如果有导入的笔记，选择第一个
        if (appState.notes.length > 0) {
            selectNote(appState.notes[0].id);
        }
        
    } catch (error) {
        console.error('导入失败:', error);
        showToast('导入失败，请检查数据格式', 'error');
    }
}

// 处理键盘快捷键
function handleKeyboardShortcuts(e) {
    // 忽略输入框中的快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // Ctrl/Cmd + S: 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentNote();
    }
    
    // Ctrl/Cmd + N: 新建笔记
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewNote();
    }
    
    // Delete: 删除当前笔记
    if (e.key === 'Delete') {
        e.preventDefault();
        deleteCurrentNote();
    }
    
    // Ctrl/Cmd + F: 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
    }
    
    // Escape: 取消搜索
    if (e.key === 'Escape') {
        if (elements.searchInput === document.activeElement) {
            elements.searchInput.value = '';
            appState.searchTerm = '';
            renderNotesList();
        }
    }
}

// 处理离开页面
function handleBeforeUnload(e) {
    if (appState.isDataChanged) {
        e.preventDefault();
        e.returnValue = '您有未保存的更改，确定要离开吗？';
        return e.returnValue;
    }
}

// 显示提示消息
function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// HTML转义，防止XSS攻击
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);
