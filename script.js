// Global variables
let rowCounter = 0;
let rows = [];
let pausedTimers = {};
let currentTimeInterval = null;
let currentRemarksRowId = null;

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
    
    // Process
    const tdProcess = document.createElement('td');
    const processInput = createInput('process', data.process, data.id);
    tdProcess.appendChild(processInput);
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
    
    // Remarks - Now clickable
    const tdRemarks = document.createElement('td');
    const remarksDiv = document.createElement('div');
    remarksDiv.className = 'remarks-field';
    remarksDiv.id = `remarksDisplay-${data.id}`;
    remarksDiv.textContent = data.remarks || 'Click to add remarks...';
    if (data.remarks) {
        remarksDiv.classList.add('has-text');
    }
    remarksDiv.onclick = () => openRemarksModal(data.id);
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

// Create input field
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

// Update remarks display
function updateRemarksDisplay(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    const display = document.getElementById(`remarksDisplay-${rowId}`);
    if (display) {
        display.textContent = row.remarks || 'Click to add remarks...';
        if (row.remarks) {
            display.classList.add('has-text');
        } else {
            display.classList.remove('has-text');
        }
    }
}

// Open remarks modal
function openRemarksModal(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    currentRemarksRowId = rowId;
    const textarea = document.getElementById('remarksTextarea');
    textarea.value = row.remarks || '';
    document.getElementById('remarksModal').style.display = 'block';
    
    // Focus textarea after a small delay
    setTimeout(() => textarea.focus(), 100);
}

// Close remarks modal
function closeRemarksModal() {
    document.getElementById('remarksModal').style.display = 'none';
    currentRemarksRowId = null;
}

// Save remarks
function saveRemarks() {
    if (currentRemarksRowId === null) return;
    
    const textarea = document.getElementById('remarksTextarea');
    const remarks = textarea.value.trim();
    
    updateRowData(currentRemarksRowId, 'remarks', remarks);
    updateRemarksDisplay(currentRemarksRowId);
    
    closeRemarksModal();
}

// Close modal when clicking outside
document.addEventListener('click', (event) => {
    const modal = document.getElementById('remarksModal');
    if (event.target === modal) {
        closeRemarksModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeRemarksModal();
    }
});

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
    
    const pauseBtn = document.querySelector(`#row-${rowId} .btn-table.btn-pause, #row-${rowId} .btn-table.btn-resume`);
    
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
            `"${row.product || ''}"`,
            `"${row.sku || ''}"`,
            `"${row.section || ''}"`,
            `"${row.process || ''}"`,
            `"${row.oprt || ''}"`,
            `"${row.mte || ''}"`,
            `"${row.workUnit || ''}"`,
            `"${row.startTime || ''}"`,
            `"${row.endTime || ''}"`,
            `"${formatPausedTime(row.pausedTime || 0)}"`,
            `"${row.remarks || ''}"`
        ];
        csvRows.push(rowData.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
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
        document.getElementById(`startTime-${rowId}`).textContent = timeStr;
        saveData();
    }
}

// Override addNewRow to set start time
const originalAddNewRow = addNewRow;
addNewRow = function() {
    originalAddNewRow();
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
        setTimeout(() => updateStartTime(lastRow.id), 100);
    }
};

// Auto-save on page unload
window.addEventListener('beforeunload', () => {
    saveData();
});
