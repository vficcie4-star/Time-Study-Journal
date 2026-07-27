// Global variables
let rowCounter = 0;
let rows = [];
let pausedTimers = {};
let currentTimeInterval = null;
let modalContext = null; // Store which field is being edited

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addRowBtn').addEventListener('click', addNewRow);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    document.getElementById('exportCSVBtn').addEventListener('click', exportCSV);
    
    // Modal event listeners
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalDoneBtn').addEventListener('click', saveModalText);
    
    // Close modal on backdrop click
    document.getElementById('textModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('textModal').classList.contains('active')) {
            closeModal();
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && document.getElementById('textModal').classList.contains('active')) {
            saveModalText();
        }
    });
}

// Update current time and date
function updateDateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    document.getElementById('currentTime').textContent = timeStr;
    
    const dateStr = now.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).toUpperCase();
    document.getElementById('currentDate').textContent = dateStr;
}

// Add new row
function addNewRow() {
    rowCounter++;
    const rowId = rowCounter;
    
    const rowData = {
        id: rowId,
        product: '',
        sku: '',
        section: '',
        process: '',
        oprt: '',
        mte: '',
        workUnit: '',
        startTime: '',
        endTime: '',
        pausedTime: 0,
        isPaused: false,
        isStopped: false,
        pauseStartTime: null,
        remarks: ''
    };
    
    rows.push(rowData);
    renderRow(rowData);
    saveData();
    
    // Auto-set start time
    setTimeout(() => updateStartTime(rowId), 100);
    
    // Scroll to the new row
    setTimeout(() => {
        const newRow = document.getElementById(`entry-${rowId}`);
        if (newRow) {
            newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 200);
}

// Render a single row (2 rows per entry)
function renderRow(data) {
    const tbody = document.getElementById('tableBody');
    
    // Create entry group
    const entryGroup = document.createElement('tr');
    entryGroup.className = 'entry-row';
    entryGroup.id = `entry-${data.id}`;
    entryGroup.dataset.id = data.id;
    
    // Row 1: Text fields (No., Product, SKU, Section, Process, Oprt, MTE, Work Unit, Remarks, Action)
    const fields = [
        { key: 'no', type: 'text' },
        { key: 'product', type: 'clickable' },
        { key: 'sku', type: 'clickable' },
        { key: 'section', type: 'clickable' },
        { key: 'process', type: 'clickable' },
        { key: 'oprt', type: 'clickable' },
        { key: 'mte', type: 'clickable' },
        { key: 'workUnit', type: 'clickable' },
        { key: 'remarks', type: 'clickable' },
        { key: 'action', type: 'action' }
    ];
    
    fields.forEach((field, index) => {
        const td = document.createElement('td');
        
        switch(field.key) {
            case 'no':
                td.textContent = data.id;
                td.style.fontWeight = '600';
                td.style.textAlign = 'center';
                break;
                
            case 'product':
            case 'sku':
            case 'section':
            case 'oprt':
                const input = createInput(field.key, data[field.key], data.id);
                td.appendChild(input);
                break;
                
            case 'process':
            case 'mte':
            case 'workUnit':
            case 'remarks':
                const div = document.createElement('div');
                div.className = 'input-field input-clickable';
                const placeholder = `Click to add ${field.key}...`;
                div.textContent = data[field.key] || placeholder;
                div.onclick = () => openModal(field.key, data.id, data[field.key]);
                td.appendChild(div);
                break;
                
            case 'action':
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '✕';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => deleteRow(data.id);
                td.appendChild(deleteBtn);
                break;
        }
        
        entryGroup.appendChild(td);
    });
    
    tbody.appendChild(entryGroup);
    
    // Row 2: Time fields (Start Time, End Time, Paused Time)
    const timeRow = document.createElement('tr');
    timeRow.className = 'time-row';
    timeRow.id = `time-${data.id}`;
    timeRow.dataset.id = data.id;
    
    // Create empty cells for No. (colspan handled by using first cell)
    const emptyTd = document.createElement('td');
    timeRow.appendChild(emptyTd);
    
    // Time container spanning from Product to Work Unit (columns 2-8)
    const timeTd = document.createElement('td');
    timeTd.colSpan = 8;
    timeTd.style.padding = '4px 3px';
    
    const timeContainer = document.createElement('div');
    timeContainer.className = 'time-container';
    
    // Start Time
    const startTimeItem = document.createElement('div');
    startTimeItem.className = 'time-item';
    startTimeItem.innerHTML = `
        <div class="time-label">Start</div>
        <div class="time-display" id="startTime-${data.id}">${data.startTime || '--:--:--'}</div>
    `;
    timeContainer.appendChild(startTimeItem);
    
    // End Time
    const endTimeItem = document.createElement('div');
    endTimeItem.className = 'time-item';
    endTimeItem.innerHTML = `
        <div class="time-label">End</div>
        <div class="time-display" id="endTimeDisplay-${data.id}">${data.endTime || '--:--:--'}</div>
    `;
    timeContainer.appendChild(endTimeItem);
    
    // Paused Time
    const pausedTimeItem = document.createElement('div');
    pausedTimeItem.className = 'time-item';
    pausedTimeItem.innerHTML = `
        <div class="time-label">Paused</div>
        <div class="paused-display" id="pausedDisplay-${data.id}">${formatPausedTime(data.pausedTime || 0)}</div>
    `;
    timeContainer.appendChild(pausedTimeItem);
    
    // Action buttons for time
    const actionItem = document.createElement('div');
    actionItem.className = 'time-item';
    actionItem.style.minWidth = '70px';
    actionItem.innerHTML = `
        <div class="time-label">Actions</div>
        <div style="display: flex; gap: 2px; width: 100%;">
            <button class="btn-table btn-stop" onclick="stopTimer(${data.id})">Stop</button>
            <button class="btn-table ${data.isPaused ? 'btn-resume' : 'btn-pause'}" onclick="togglePause(${data.id})">
                ${data.isPaused ? 'Resume' : 'Pause'}
            </button>
        </div>
    `;
    timeContainer.appendChild(actionItem);
    
    timeTd.appendChild(timeContainer);
    timeRow.appendChild(timeTd);
    
    // Empty cell for Remarks (colspan handled)
    const emptyTd2 = document.createElement('td');
    timeRow.appendChild(emptyTd2);
    
    // Empty cell for Action
    const emptyTd3 = document.createElement('td');
    timeRow.appendChild(emptyTd3);
    
    tbody.appendChild(timeRow);
    
    // If it was paused, restart the timer
    if (data.isPaused && !data.isStopped) {
        startPauseTimer(data.id);
    }
}

// Create input field (for short text inputs)
function createInput(field, value, rowId) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-field';
    input.value = value || '';
    input.placeholder = field.charAt(0).toUpperCase() + field.slice(1);
    input.onchange = (e) => updateRowData(rowId, field, e.target.value);
    input.oninput = (e) => {
        updateRowData(rowId, field, e.target.value);
    };
    return input;
}

// Update row data
function updateRowData(rowId, field, value) {
    const row = rows.find(r => r.id === rowId);
    if (row) {
        row[field] = value;
        saveData();
    }
}

// Open modal for text input
function openModal(field, rowId, currentValue) {
    modalContext = { field, rowId };
    const modal = document.getElementById('textModal');
    const textarea = document.getElementById('modalTextArea');
    const title = document.getElementById('modalTitle');
    
    // Set title
    const fieldNames = {
        'remarks': 'Remarks',
        'product': 'Product',
        'sku': 'SKU',
        'section': 'Section',
        'process': 'Process',
        'oprt': 'Oprt',
        'mte': 'MTE',
        'workUnit': 'Work Unit'
    };
    title.textContent = `Edit ${fieldNames[field] || field}`;
    
    // Set value
    textarea.value = currentValue || '';
    
    // Focus and select text
    setTimeout(() => {
        textarea.focus();
        textarea.select();
    }, 100);
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('textModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    modalContext = null;
}

// Save modal text
function saveModalText() {
    if (!modalContext) return;
    
    const textarea = document.getElementById('modalTextArea');
    const value = textarea.value;
    const { field, rowId } = modalContext;
    
    // Update data
    updateRowData(rowId, field, value);
    
    // Update display in table
    const row = rows.find(r => r.id === rowId);
    if (row) {
        const rowElement = document.getElementById(`entry-${rowId}`);
        if (rowElement) {
            const cells = rowElement.querySelectorAll('td');
            const fieldIndex = {
                'product': 1,
                'sku': 2,
                'section': 3,
                'process': 4,
                'oprt': 5,
                'mte': 6,
                'workUnit': 7,
                'remarks': 8
            };
            
            const index = fieldIndex[field];
            if (index !== undefined && cells[index]) {
                const clickableDiv = cells[index].querySelector('.input-clickable');
                if (clickableDiv) {
                    const placeholder = `Click to add ${field}...`;
                    clickableDiv.textContent = value || placeholder;
                }
            }
        }
    }
    
    closeModal();
}

// Stop timer
function stopTimer(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row || row.isStopped) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    row.endTime = timeStr;
    row.isStopped = true;
    row.isPaused = false;
    
    // Clear pause timer if any
    if (pausedTimers[rowId]) {
        clearInterval(pausedTimers[rowId]);
        delete pausedTimers[rowId];
    }
    
    // Update display
    document.getElementById(`endTimeDisplay-${rowId}`).textContent = timeStr;
    
    // Update button states
    const timeRow = document.getElementById(`time-${rowId}`);
    if (timeRow) {
        const buttons = timeRow.querySelectorAll('.btn-table');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }
    
    // Update paused time display
    const pausedDisplay = document.getElementById(`pausedDisplay-${rowId}`);
    pausedDisplay.textContent = formatPausedTime(row.pausedTime || 0);
    
    saveData();
}

// Toggle pause
function togglePause(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row || row.isStopped) return;
    
    const timeRow = document.getElementById(`time-${rowId}`);
    const pauseBtn = timeRow.querySelector('.btn-table.btn-pause, .btn-table.btn-resume');
    
    if (row.isPaused) {
        // Resume
        row.isPaused = false;
        if (pausedTimers[rowId]) {
            clearInterval(pausedTimers[rowId]);
            delete pausedTimers[rowId];
        }
        if (row.pauseStartTime) {
            const pauseDuration = (Date.now() - row.pauseStartTime) / 1000;
            row.pausedTime = (row.pausedTime || 0) + pauseDuration;
            row.pauseStartTime = null;
        }
        pauseBtn.textContent = 'Pause';
        pauseBtn.className = 'btn-table btn-pause';
    } else {
        // Pause
        row.isPaused = true;
        row.pauseStartTime = Date.now();
        pauseBtn.textContent = 'Resume';
        pauseBtn.className = 'btn-table btn-resume';
        startPauseTimer(rowId);
    }
    
    saveData();
}

// Start pause timer
function startPauseTimer(rowId) {
    if (pausedTimers[rowId]) {
        clearInterval(pausedTimers[rowId]);
    }
    
    pausedTimers[rowId] = setInterval(() => {
        const row = rows.find(r => r.id === rowId);
        if (row && row.isPaused && row.pauseStartTime) {
            const elapsed = (Date.now() - row.pauseStartTime) / 1000;
            const totalPaused = (row.pausedTime || 0) + elapsed;
            const display = document.getElementById(`pausedDisplay-${rowId}`);
            if (display) {
                display.textContent = formatPausedTime(totalPaused);
            }
        }
    }, 1000);
}

// Format paused time
function formatPausedTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Delete row
function deleteRow(rowId) {
    if (confirm('Delete this row?')) {
        // Clear pause timer
        if (pausedTimers[rowId]) {
            clearInterval(pausedTimers[rowId]);
            delete pausedTimers[rowId];
        }
        
        rows = rows.filter(r => r.id !== rowId);
        const entryRow = document.getElementById(`entry-${rowId}`);
        const timeRow = document.getElementById(`time-${rowId}`);
        if (entryRow) entryRow.remove();
        if (timeRow) timeRow.remove();
        saveData();
        renumberRows();
    }
}

// Renumber rows
function renumberRows() {
    const tbody = document.getElementById('tableBody');
    const entryRows = tbody.querySelectorAll('tr.entry-row');
    
    entryRows.forEach((row, index) => {
        const tdNo = row.querySelector('td:first-child');
        if (tdNo) {
            tdNo.textContent = index + 1;
        }
        const rowId = parseInt(row.dataset.id);
        const rowData = rows.find(r => r.id === rowId);
        if (rowData) {
            rowData.id = index + 1;
        }
        row.dataset.id = index + 1;
        // Update corresponding time row
        const timeRow = document.getElementById(`time-${rowId}`);
        if (timeRow) {
            timeRow.dataset.id = index + 1;
        }
    });
    rowCounter = rows.length;
    saveData();
}

// Clear history
function clearHistory() {
    if (confirm('Clear all history?')) {
        // Clear all timers
        Object.keys(pausedTimers).forEach(key => {
            clearInterval(pausedTimers[key]);
            delete pausedTimers[key];
        });
        
        rows = [];
        rowCounter = 0;
        document.getElementById('tableBody').innerHTML = '';
        saveData();
    }
}

// Export CSV
function exportCSV() {
    if (rows.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = ['No.', 'Product', 'SKU', 'Section', 'Process', 'Oprt', 'MTE', 'Work Unit', 'Start Time', 'End Time', 'Paused Time', 'Remarks'];
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    rows.forEach(row => {
        const rowData = [
            row.id,
            `"${(row.product || '').replace(/"/g, '""')}"`,
            `"${(row.sku || '').replace(/"/g, '""')}"`,
            `"${(row.section || '').replace(/"/g, '""')}"`,
            `"${(row.process || '').replace(/"/g, '""')}"`,
            `"${(row.oprt || '').replace(/"/g, '""')}"`,
            `"${(row.mte || '').replace(/"/g, '""')}"`,
            `"${(row.workUnit || '').replace(/"/g, '""')}"`,
            `"${row.startTime || ''}"`,
            `"${row.endTime || ''}"`,
            `"${formatPausedTime(row.pausedTime || 0)}"`,
            `"${(row.remarks || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(rowData.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `journal_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Save data to localStorage
function saveData() {
    try {
        const dataToSave = {
            rows: rows,
            rowCounter: rowCounter
        };
        localStorage.setItem('journalData', JSON.stringify(dataToSave));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

// Load data from localStorage
function loadData() {
    try {
        const savedData = localStorage.getItem('journalData');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            rows = parsed.rows || [];
            rowCounter = parsed.rowCounter || 0;
            
            // Render all rows
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            rows.forEach(row => {
                renderRow(row);
                // Restart pause timers if needed
                if (row.isPaused && !row.isStopped) {
                    startPauseTimer(row.id);
                }
            });
        }
    } catch (e) {
        console.error('Error loading data:', e);
        rows = [];
        rowCounter = 0;
    }
}

// Update start time when adding row
function updateStartTime(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (row && !row.startTime) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        row.startTime = timeStr;
        const display = document.getElementById(`startTime-${rowId}`);
        if (display) {
            display.textContent = timeStr;
        }
        saveData();
    }
}

// Auto-save on page unload
window.addEventListener('beforeunload', () => {
    saveData();
});

// Handle visibility change to keep timers accurate
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveData();
    } else {
        rows.forEach(row => {
            if (row.isPaused && !row.isStopped && row.pauseStartTime) {
                startPauseTimer(row.id);
            }
        });
    }
});
