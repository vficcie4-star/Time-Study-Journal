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
}

// Render a single row
function renderRow(data) {
    const tbody = document.getElementById('tableBody');
    const tr = document.createElement('tr');
    tr.id = `row-${data.id}`;
    tr.dataset.id = data.id;
    
    // No.
    const tdNo = document.createElement('td');
    tdNo.textContent = data.id;
    tdNo.style.fontWeight = '600';
    tr.appendChild(tdNo);
    
    // Product
    const tdProduct = document.createElement('td');
    const productInput = createInput('product', data.product, data.id);
    tdProduct.appendChild(productInput);
    tr.appendChild(tdProduct);
    
    // SKU
    const tdSku = document.createElement('td');
    const skuInput = createInput('sku', data.sku, data.id);
    tdSku.appendChild(skuInput);
    tr.appendChild(tdSku);
    
    // Section
    const tdSection = document.createElement('td');
    const sectionInput = createInput('section', data.section, data.id);
    tdSection.appendChild(sectionInput);
    tr.appendChild(tdSection);
    
    // Process - Clickable to open modal
    const tdProcess = document.createElement('td');
    const processDiv = document.createElement('div');
    processDiv.className = 'input-field input-clickable';
    processDiv.textContent = data.process || 'Click to add process...';
    processDiv.style.overflow = 'hidden';
    processDiv.style.textOverflow = 'ellipsis';
    processDiv.style.whiteSpace = 'nowrap';
    processDiv.style.maxWidth = '120px';
    processDiv.onclick = () => openModal('process', data.id, data.process);
    tdProcess.appendChild(processDiv);
    tr.appendChild(tdProcess);
    
    // Oprt
    const tdOprt = document.createElement('td');
    const oprtInput = createInput('oprt', data.oprt, data.id);
    tdOprt.appendChild(oprtInput);
    tr.appendChild(tdOprt);
    
    // MTE
    const tdMte = document.createElement('td');
    const mteInput = createInput('mte', data.mte, data.id);
    tdMte.appendChild(mteInput);
    tr.appendChild(tdMte);
    
    // Work Unit
    const tdWorkUnit = document.createElement('td');
    const workUnitInput = createInput('workUnit', data.workUnit, data.id);
    tdWorkUnit.appendChild(workUnitInput);
    tr.appendChild(tdWorkUnit);
    
    // Start Time
    const tdStartTime = document.createElement('td');
    tdStartTime.textContent = data.startTime || '--:--:--';
    tdStartTime.className = 'time-display';
    tdStartTime.id = `startTime-${data.id}`;
    tr.appendChild(tdStartTime);
    
    // End Time
    const tdEndTime = document.createElement('td');
    tdEndTime.id = `endTime-${data.id}`;
    
    const endTimeContainer = document.createElement('div');
    endTimeContainer.style.display = 'flex';
    endTimeContainer.style.flexDirection = 'column';
    endTimeContainer.style.gap = '2px';
    
    const endTimeDisplay = document.createElement('div');
    endTimeDisplay.textContent = data.endTime || '--:--:--';
    endTimeDisplay.className = 'time-display';
    endTimeDisplay.id = `endTimeDisplay-${data.id}`;
    endTimeContainer.appendChild(endTimeDisplay);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '2px';
    
    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.className = 'btn-table btn-stop';
    stopBtn.onclick = () => stopTimer(data.id);
    buttonContainer.appendChild(stopBtn);
    
    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = data.isPaused ? 'Resume' : 'Pause';
    pauseBtn.className = `btn-table ${data.isPaused ? 'btn-resume' : 'btn-pause'}`;
    pauseBtn.onclick = () => togglePause(data.id);
    buttonContainer.appendChild(pauseBtn);
    
    endTimeContainer.appendChild(buttonContainer);
    tdEndTime.appendChild(endTimeContainer);
    tr.appendChild(tdEndTime);
    
    // Paused Time
    const tdPaused = document.createElement('td');
    const pausedDisplay = document.createElement('div');
    pausedDisplay.className = 'paused-display';
    pausedDisplay.id = `pausedDisplay-${data.id}`;
    pausedDisplay.textContent = formatPausedTime(data.pausedTime || 0);
    tdPaused.appendChild(pausedDisplay);
    tr.appendChild(tdPaused);
    
    // Remarks - Clickable to open modal
    const tdRemarks = document.createElement('td');
    const remarksDiv = document.createElement('div');
    remarksDiv.className = 'input-field input-clickable';
    remarksDiv.textContent = data.remarks || 'Click to add remarks...';
    remarksDiv.style.overflow = 'hidden';
    remarksDiv.style.textOverflow = 'ellipsis';
    remarksDiv.style.whiteSpace = 'nowrap';
    remarksDiv.style.maxWidth = '120px';
    remarksDiv.onclick = () => openModal('remarks', data.id, data.remarks);
    tdRemarks.appendChild(remarksDiv);
    tr.appendChild(tdRemarks);
    
    // Action
    const tdAction = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = () => deleteRow(data.id);
    tdAction.appendChild(deleteBtn);
    tr.appendChild(tdAction);
    
    tbody.appendChild(tr);
    
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
        // Auto-save on input
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
        const rowElement = document.getElementById(`row-${rowId}`);
        if (rowElement) {
            // Find the correct cell based on field
            const cells = rowElement.querySelectorAll('td');
            const fieldIndex = {
                'product': 1,
                'sku': 2,
                'section': 3,
                'process': 4,
                'oprt': 5,
                'mte': 6,
                'workUnit': 7,
                'remarks': 11
            };
            
            const index = fieldIndex[field];
            if (index !== undefined && cells[index]) {
                // Check if it's a clickable div (process or remarks) or input field
                const clickableDiv = cells[index].querySelector('.input-clickable');
                if (clickableDiv) {
                    // For Process and Remarks fields
                    const placeholder = field === 'process' ? 'Click to add process...' : 'Click to add remarks...';
                    clickableDiv.textContent = value || placeholder;
                } else {
                    // For regular input fields
                    const input = cells[index].querySelector('.input-field');
                    if (input) {
                        input.value = value;
                    }
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
    const rowElement = document.getElementById(`row-${rowId}`);
    const buttons = rowElement.querySelectorAll('.btn-table');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    // Update paused time display
    const pausedDisplay = document.getElementById(`pausedDisplay-${rowId}`);
    pausedDisplay.textContent = formatPausedTime(row.pausedTime || 0);
    
    saveData();
}

// Toggle pause
function togglePause(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row || row.isStopped) return;
    
    const rowElement = document.getElementById(`row-${rowId}`);
    const pauseBtn = rowElement.querySelector('.btn-table.btn-pause, .btn-table.btn-resume');
    
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
        const rowElement = document.getElementById(`row-${rowId}`);
        if (rowElement) {
            rowElement.remove();
        }
        saveData();
        renumberRows();
    }
}

// Renumber rows
function renumberRows() {
    const tbody = document.getElementById('tableBody');
    const rowElements = tbody.querySelectorAll('tr');
    const sortedRows = rows.sort((a, b) => a.id - b.id);
    
    rowElements.forEach((row, index) => {
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
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
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
        // Page is hidden, save data
        saveData();
    } else {
        // Page is visible again, update timers
        rows.forEach(row => {
            if (row.isPaused && !row.isStopped && row.pauseStartTime) {
                // Restart pause timer if needed
                startPauseTimer(row.id);
            }
        });
    }
});
