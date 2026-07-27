// Global variables
let rowCounter = 0;
let rows = [];
let pausedTimers = {};
let currentTimeInterval = null;
let modalContext = null; // Store which row is being edited

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
    
    // Product Modal event listeners
    document.getElementById('productModalCancelBtn').addEventListener('click', closeProductModal);
    document.getElementById('productModalDoneBtn').addEventListener('click', saveProductModal);
    
    // Close modal on backdrop click
    document.getElementById('productModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeProductModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('productModal').classList.contains('active')) {
            closeProductModal();
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && document.getElementById('productModal').classList.contains('active')) {
            saveProductModal();
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
        const newRow = document.getElementById(`row-${rowId}`);
        if (newRow) {
            newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 200);
    
    // Open product modal for the new row
    setTimeout(() => {
        openProductModal(rowId);
    }, 300);
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
    tdNo.style.textAlign = 'center';
    tr.appendChild(tdNo);
    
    // Product - Clickable to open modal
    const tdProduct = document.createElement('td');
    const productDiv = document.createElement('div');
    productDiv.className = `product-cell ${data.product ? 'has-value' : 'empty'}`;
    productDiv.textContent = data.product || 'Click to add product...';
    productDiv.onclick = () => openProductModal(data.id);
    tdProduct.appendChild(productDiv);
    tr.appendChild(tdProduct);
    
    // Process
    const tdProcess = document.createElement('td');
    const processDiv = document.createElement('div');
    processDiv.className = 'process-cell';
    processDiv.textContent = data.process || '-';
    processDiv.title = data.process || '';
    processDiv.onclick = () => openProductModal(data.id);
    tdProcess.appendChild(processDiv);
    tr.appendChild(tdProcess);
    
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
    endTimeContainer.style.gap = '4px';
    endTimeContainer.style.alignItems = 'center';
    
    const endTimeDisplay = document.createElement('div');
    endTimeDisplay.textContent = data.endTime || '--:--:--';
    endTimeDisplay.className = 'time-display';
    endTimeDisplay.id = `endTimeDisplay-${data.id}`;
    endTimeContainer.appendChild(endTimeDisplay);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '4px';
    buttonContainer.style.flexWrap = 'wrap';
    buttonContainer.style.justifyContent = 'center';
    
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
    
    // Action - Delete only
    const tdAction = document.createElement('td');
    tdAction.style.textAlign = 'center';
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

// Open product modal
function openProductModal(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    modalContext = rowId;
    const modal = document.getElementById('productModal');
    
    // Fill form with existing data
    document.getElementById('modalProduct').value = row.product || '';
    document.getElementById('modalSKU').value = row.sku || '';
    document.getElementById('modalSection').value = row.section || '';
    document.getElementById('modalProcess').value = row.process || '';
    document.getElementById('modalOprt').value = row.oprt || '';
    document.getElementById('modalMTE').value = row.mte || '';
    document.getElementById('modalRemarks').value = row.remarks || '';
    
    document.getElementById('productModalTitle').textContent = `Product Details - #${row.id}`;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('modalProduct').focus();
    }, 100);
}

// Close product modal
function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    modalContext = null;
}

// Save product modal
function saveProductModal() {
    if (!modalContext) return;
    
    const rowId = modalContext;
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    // Get values from modal
    const product = document.getElementById('modalProduct').value.trim();
    const sku = document.getElementById('modalSKU').value.trim();
    const section = document.getElementById('modalSection').value.trim();
    const process = document.getElementById('modalProcess').value.trim();
    const oprt = document.getElementById('modalOprt').value.trim();
    const mte = document.getElementById('modalMTE').value.trim();
    const remarks = document.getElementById('modalRemarks').value.trim();
    
    // Update row data
    row.product = product;
    row.sku = sku;
    row.section = section;
    row.process = process;
    row.oprt = oprt;
    row.mte = mte;
    row.remarks = remarks;
    
    // Update display
    updateRowDisplay(rowId);
    saveData();
    
    closeProductModal();
}

// Update row display after modal save
function updateRowDisplay(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    const rowElement = document.getElementById(`row-${rowId}`);
    if (!rowElement) return;
    
    // Update Product cell
    const productCell = rowElement.querySelector('.product-cell');
    if (productCell) {
        productCell.textContent = row.product || 'Click to add product...';
        productCell.className = `product-cell ${row.product ? 'has-value' : 'empty'}`;
    }
    
    // Update Process cell
    const processCell = rowElement.querySelector('.process-cell');
    if (processCell) {
        processCell.textContent = row.process || '-';
        processCell.title = row.process || '';
    }
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

// Export CSV with all fields
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
