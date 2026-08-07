// Global variables
let rowCounter = 0;
let rows = [];
let pausedTimers = {};
let currentTimeInterval = null;
let editingRowId = null;
let notes = '';
let notesLastSaved = null;

// Count variables
let countTransactions = [];
let countPausedTimers = {};
let countRowCounter = 0;

// Drag and drop variables
let dragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    sourceRow: null,
    sourceId: null,
    clone: null,
    longPressTimer: null,
    isLongPress: false,
    touchId: null,
    dragOffsetX: 0,
    dragOffsetY: 0
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
    setupAutocomplete();
    updateWordCount();
    setupDragAndDrop();
});

// Setup drag and drop - entire row is draggable
function setupDragAndDrop() {
    const tbody = document.getElementById('tableBody');
    
    // Mouse events for desktop
    tbody.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    
    // Touch events for mobile
    tbody.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('touchcancel', onTouchEnd, { passive: false });
}

// Touch start handler
function onTouchStart(e) {
    const touch = e.touches[0];
    const target = e.target.closest('tr');
    
    // Ignore if clicking on buttons, inputs, or clickable elements
    if (e.target.closest('button') || e.target.closest('.product-cell') || 
        e.target.closest('.process-cell') || e.target.closest('.delete-btn') ||
        e.target.closest('.btn-table') || e.target.closest('input')) {
        return;
    }
    
    if (!target) return;
    if (target.id === 'tableFooter') return;
    if (target.closest('#tableFooter')) return;
    
    const rowId = parseInt(target.dataset.id);
    if (isNaN(rowId)) return;
    
    // Store touch start position
    const rect = target.getBoundingClientRect();
    dragState.startX = touch.clientX;
    dragState.startY = touch.clientY;
    dragState.dragOffsetX = touch.clientX - rect.left;
    dragState.dragOffsetY = touch.clientY - rect.top;
    dragState.touchId = touch.identifier;
    dragState.sourceRow = target;
    dragState.sourceId = rowId;
    dragState.isLongPress = false;
    
    // Start long press timer (500ms for mobile)
    clearTimeout(dragState.longPressTimer);
    dragState.longPressTimer = setTimeout(() => {
        if (dragState.sourceRow) {
            dragState.isLongPress = true;
            // Prevent default touch behavior
            e.preventDefault();
            startDragging(dragState.sourceRow, dragState.sourceId, touch.clientX, touch.clientY);
        }
    }, 500);
}

// Touch move handler
function onTouchMove(e) {
    if (!dragState.isDragging) {
        // Check if user moved too much (cancel long press)
        const touch = e.touches[0];
        if (dragState.startX && dragState.startY) {
            const dx = Math.abs(touch.clientX - dragState.startX);
            const dy = Math.abs(touch.clientY - dragState.startY);
            if (dx > 10 || dy > 10) {
                clearTimeout(dragState.longPressTimer);
                dragState.sourceRow = null;
            }
        }
        return;
    }
    
    e.preventDefault();
    const touch = e.touches[0];
    dragState.currentX = touch.clientX;
    dragState.currentY = touch.clientY;
    
    // Update clone position
    if (dragState.clone) {
        dragState.clone.style.left = (touch.clientX - dragState.dragOffsetX) + 'px';
        dragState.clone.style.top = (touch.clientY - dragState.dragOffsetY) + 'px';
    }
    
    // Find drop target
    findDropTarget(touch.clientX, touch.clientY);
}

// Touch end handler
function onTouchEnd(e) {
    clearTimeout(dragState.longPressTimer);
    
    if (dragState.isDragging) {
        e.preventDefault();
        finishDragging();
    }
    
    // Reset state
    dragState.sourceRow = null;
    dragState.startX = 0;
    dragState.startY = 0;
    dragState.isLongPress = false;
    dragState.touchId = null;
}

// Mouse down handler (desktop)
function onDragStart(e) {
    const target = e.target.closest('tr');
    
    // Ignore if clicking on buttons, inputs, or clickable elements
    if (e.target.closest('button') || e.target.closest('.product-cell') || 
        e.target.closest('.process-cell') || e.target.closest('.delete-btn') ||
        e.target.closest('.btn-table') || e.target.closest('input')) {
        return;
    }
    
    if (!target) return;
    if (target.id === 'tableFooter') return;
    if (target.closest('#tableFooter')) return;
    
    const rowId = parseInt(target.dataset.id);
    if (isNaN(rowId)) return;
    
    // For desktop, start dragging immediately on mousedown on row
    const rect = target.getBoundingClientRect();
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.dragOffsetX = e.clientX - rect.left;
    dragState.dragOffsetY = e.clientY - rect.top;
    dragState.sourceRow = target;
    dragState.sourceId = rowId;
    dragState.isLongPress = true;
    
    startDragging(target, rowId, e.clientX, e.clientY);
    e.preventDefault();
}

// Mouse move handler (desktop)
function onDragMove(e) {
    if (!dragState.isDragging) return;
    
    e.preventDefault();
    dragState.currentX = e.clientX;
    dragState.currentY = e.clientY;
    
    // Update clone position
    if (dragState.clone) {
        dragState.clone.style.left = (e.clientX - dragState.dragOffsetX) + 'px';
        dragState.clone.style.top = (e.clientY - dragState.dragOffsetY) + 'px';
    }
    
    // Find drop target
    findDropTarget(e.clientX, e.clientY);
}

// Mouse up handler (desktop)
function onDragEnd(e) {
    if (dragState.isDragging) {
        finishDragging();
    }
    
    // Reset state
    dragState.sourceRow = null;
    dragState.startX = 0;
    dragState.startY = 0;
    dragState.isLongPress = false;
}

// Find drop target
function findDropTarget(clientX, clientY) {
    // Get all rows except the source row and footer
    const rows = document.querySelectorAll('#tableBody tr:not(.dragging)');
    let targetRow = null;
    let insertBefore = false;
    
    for (const row of rows) {
        const rect = row.getBoundingClientRect();
        // Check if point is over this row
        if (clientX >= rect.left && clientX <= rect.right &&
            clientY >= rect.top && clientY <= rect.bottom) {
            targetRow = row;
            // Check if we should insert before or after
            const midY = rect.top + rect.height / 2;
            insertBefore = clientY < midY;
            break;
        }
    }
    
    // Remove existing drag-over classes
    document.querySelectorAll('#tableBody tr.drag-over, #tableBody tr.drag-over-top').forEach(el => {
        el.classList.remove('drag-over', 'drag-over-top');
    });
    
    if (targetRow && targetRow !== dragState.sourceRow) {
        if (insertBefore) {
            targetRow.classList.add('drag-over-top');
        } else {
            targetRow.classList.add('drag-over');
        }
    }
}

// Start dragging
function startDragging(row, rowId, x, y) {
    if (dragState.isDragging) return;
    
    dragState.isDragging = true;
    dragState.sourceRow = row;
    dragState.sourceId = rowId;
    
    // Get row dimensions
    const rect = row.getBoundingClientRect();
    
    // Add dragging class to source row
    row.classList.add('dragging');
    
    // Create clone
    const clone = row.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.width = rect.width + 'px';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '10000';
    clone.style.opacity = '0.9';
    clone.style.transform = 'scale(1.02) rotate(-1deg)';
    clone.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
    clone.style.borderRadius = '8px';
    clone.style.backgroundColor = 'white';
    clone.style.left = (x - dragState.dragOffsetX) + 'px';
    clone.style.top = (y - dragState.dragOffsetY) + 'px';
    clone.id = 'drag-clone';
    
    // Remove interactions from clone
    clone.querySelectorAll('button, .drag-handle, .product-cell, .process-cell').forEach(el => {
        el.style.pointerEvents = 'none';
        if (el.onclick) {
            el.onclick = null;
        }
    });
    
    document.body.appendChild(clone);
    dragState.clone = clone;
    
    // Show drag indicator
    const indicator = document.getElementById('dragIndicator');
    indicator.classList.add('active');
    indicator.style.left = x + 'px';
    indicator.style.top = y + 'px';
}

// Finish dragging
function finishDragging() {
    if (!dragState.isDragging) return;
    
    // Find drop target
    const targetRow = document.querySelector('#tableBody tr.drag-over, #tableBody tr.drag-over-top');
    
    if (targetRow && dragState.sourceRow && dragState.sourceRow !== targetRow) {
        const targetId = parseInt(targetRow.dataset.id);
        const sourceId = dragState.sourceId;
        
        if (!isNaN(targetId) && !isNaN(sourceId) && targetId !== sourceId) {
            const insertBefore = targetRow.classList.contains('drag-over-top');
            // Perform reorder
            reorderRows(sourceId, targetId, insertBefore);
        }
    }
    
    // Clean up
    cleanupDrag();
}

// Cleanup drag state
function cleanupDrag() {
    // Remove drag classes
    document.querySelectorAll('#tableBody tr.dragging, #tableBody tr.drag-over, #tableBody tr.drag-over-top').forEach(el => {
        el.classList.remove('dragging', 'drag-over', 'drag-over-top');
    });
    
    // Remove clone
    if (dragState.clone) {
        dragState.clone.remove();
        dragState.clone = null;
    }
    
    // Hide indicator
    const indicator = document.getElementById('dragIndicator');
    indicator.classList.remove('active');
    
    dragState.isDragging = false;
    dragState.sourceRow = null;
    dragState.sourceId = null;
}

// Reorder rows
function reorderRows(sourceId, targetId, insertBefore) {
    // Find indices
    const sourceIndex = rows.findIndex(r => r.id === sourceId);
    const targetIndex = rows.findIndex(r => r.id === targetId);
    
    if (sourceIndex === -1 || targetIndex === -1) return;
    if (sourceIndex === targetIndex) return;
    
    // Remove source from array
    const [sourceRow] = rows.splice(sourceIndex, 1);
    
    // Calculate new insert position
    let insertIndex = targetIndex;
    
    // Adjust if source was before target and we removed it
    if (sourceIndex < targetIndex) {
        insertIndex = targetIndex - 1;
    }
    
    // Insert at the correct position
    if (insertBefore) {
        // Insert before target
        rows.splice(insertIndex, 0, sourceRow);
    } else {
        // Insert after target
        rows.splice(insertIndex + 1, 0, sourceRow);
    }
    
    // Re-render all rows
    renumberAndRender();
    saveData();
}

// Renumber and render all rows
function renumberAndRender() {
    // Clear table body
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    // Reassign IDs and render
    rows.forEach((row, index) => {
        row.id = index + 1;
        renderRow(row);
        // Restart pause timers if needed
        if (row.isPaused && !row.isStopped) {
            startPauseTimer(row.id);
        }
    });
    
    rowCounter = rows.length;
    saveData();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addRowBtn').addEventListener('click', addNewRow);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    document.getElementById('notesBtn').addEventListener('click', openNotesModal);
    document.getElementById('countBtn').addEventListener('click', openCountModal);
    document.getElementById('exportCSVBtn').addEventListener('click', exportCSV);
    document.getElementById('addCountRowBtn').addEventListener('click', addCountRow);
    
    // Form modal event listeners
    document.getElementById('formCancelBtn').addEventListener('click', closeFormModal);
    document.getElementById('formSaveBtn').addEventListener('click', saveFormData);
    
    // Notes modal event listeners
    document.getElementById('notesCancelBtn').addEventListener('click', closeNotesModal);
    document.getElementById('notesSaveBtn').addEventListener('click', saveNotes);
    
    // Count modal event listeners
    document.getElementById('countCancelBtn').addEventListener('click', closeCountModal);
    document.getElementById('countSaveBtn').addEventListener('click', saveCountTransactions);
    
    // Close modal on backdrop click
    document.getElementById('formModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeFormModal();
        }
    });
    
    document.getElementById('notesModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeNotesModal();
        }
    });
    
    document.getElementById('countModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeCountModal();
        }
    });
    
    // Notes text area word count
    document.getElementById('notesTextArea').addEventListener('input', updateWordCount);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('formModal').classList.contains('active')) {
                closeFormModal();
            }
            if (document.getElementById('notesModal').classList.contains('active')) {
                closeNotesModal();
            }
            if (document.getElementById('countModal').classList.contains('active')) {
                closeCountModal();
            }
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            if (document.getElementById('formModal').classList.contains('active')) {
                saveFormData();
            }
            if (document.getElementById('notesModal').classList.contains('active')) {
                saveNotes();
            }
            if (document.getElementById('countModal').classList.contains('active')) {
                saveCountTransactions();
            }
        }
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            if (document.getElementById('notesModal').classList.contains('active')) {
                e.preventDefault();
                saveNotes();
            }
        }
    });
}

// Update word count for notes
function updateWordCount() {
    const textarea = document.getElementById('notesTextArea');
    const text = textarea.value;
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    document.getElementById('wordCount').textContent = wordCount;
    document.getElementById('charCount').textContent = charCount;
}

// Open notes modal
function openNotesModal() {
    const modal = document.getElementById('notesModal');
    const textarea = document.getElementById('notesTextArea');
    
    textarea.value = notes || '';
    updateWordCount();
    updateLastSavedInfo();
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 200);
}

// Close notes modal
function closeNotesModal() {
    const modal = document.getElementById('notesModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Save notes
function saveNotes() {
    const textarea = document.getElementById('notesTextArea');
    notes = textarea.value;
    notesLastSaved = new Date();
    updateLastSavedInfo();
    saveData();
    closeNotesModal();
}

// Update last saved info
function updateLastSavedInfo() {
    const lastSavedSpan = document.getElementById('notesLastSaved');
    if (notesLastSaved) {
        const now = new Date();
        const diffMs = now - notesLastSaved;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        
        if (diffMins > 0) {
            lastSavedSpan.textContent = `${diffMins}m ${diffSecs}s ago`;
        } else {
            lastSavedSpan.textContent = `${diffSecs}s ago`;
        }
    } else {
        lastSavedSpan.textContent = 'Never';
    }
}

// Setup autocomplete for inputs
function setupAutocomplete() {
    setupInputAutocomplete('formSection', 'sectionSuggestions', CONFIG.sections);
    setupInputAutocomplete('formProduct', 'productSuggestions', CONFIG.products);
    setupInputAutocomplete('formSKU', 'skuSuggestions', CONFIG.skus || []);
    setupInputAutocomplete('formWorkUnit', 'workUnitSuggestions', CONFIG.workUnits || []);
}

// Setup autocomplete for a specific input
function setupInputAutocomplete(inputId, suggestionsId, dataList) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    
    if (!input || !suggestionsContainer || !dataList) return;
    
    let currentFocus = -1;
    
    input.addEventListener('input', function(e) {
        const value = this.value.toLowerCase();
        suggestionsContainer.innerHTML = '';
        
        if (!value) {
            suggestionsContainer.classList.remove('active');
            return;
        }
        
        const matches = dataList.filter(item => 
            item.toLowerCase().includes(value)
        );
        
        if (matches.length === 0) {
            suggestionsContainer.classList.remove('active');
            return;
        }
        
        matches.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            
            const matchIndex = item.toLowerCase().indexOf(value);
            if (matchIndex !== -1) {
                const before = item.substring(0, matchIndex);
                const match = item.substring(matchIndex, matchIndex + value.length);
                const after = item.substring(matchIndex + value.length);
                div.innerHTML = before + '<span class="match-highlight">' + match + '</span>' + after;
            } else {
                div.textContent = item;
            }
            
            div.dataset.value = item;
            div.dataset.index = index;
            
            div.addEventListener('click', function() {
                input.value = this.dataset.value;
                suggestionsContainer.classList.remove('active');
                input.dispatchEvent(new Event('input'));
            });
            
            suggestionsContainer.appendChild(div);
        });
        
        suggestionsContainer.classList.add('active');
        currentFocus = -1;
    });
    
    input.addEventListener('keydown', function(e) {
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentFocus++;
            if (currentFocus >= items.length) currentFocus = 0;
            highlightItem(items, currentFocus);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentFocus--;
            if (currentFocus < 0) currentFocus = items.length - 1;
            highlightItem(items, currentFocus);
        } else if (e.key === 'Enter') {
            if (currentFocus >= 0 && currentFocus < items.length) {
                e.preventDefault();
                const selectedItem = items[currentFocus];
                if (selectedItem) {
                    input.value = selectedItem.dataset.value;
                    suggestionsContainer.classList.remove('active');
                    input.dispatchEvent(new Event('input'));
                }
            }
        } else if (e.key === 'Escape') {
            suggestionsContainer.classList.remove('active');
        }
    });
    
    input.addEventListener('blur', function() {
        setTimeout(() => {
            suggestionsContainer.classList.remove('active');
        }, 200);
    });
}

// Highlight suggestion item
function highlightItem(items, index) {
    items.forEach((item, i) => {
        if (i === index) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
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
        section: '',
        product: '',
        sku: '',
        process: '',
        workUnit: '',
        oprt: '',
        mte: '',
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
    
    setTimeout(() => updateStartTime(rowId), 100);
    
    setTimeout(() => {
        const newRow = document.getElementById(`row-${rowId}`);
        if (newRow) {
            newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 200);
}

// Render a single row (compact view)
function renderRow(data) {
    const tbody = document.getElementById('tableBody');
    const tr = document.createElement('tr');
    tr.id = `row-${data.id}`;
    tr.dataset.id = data.id;
    tr.setAttribute('draggable', 'false');
    
    // No.
    const tdNo = document.createElement('td');
    tdNo.textContent = data.id;
    tdNo.style.fontWeight = '600';
    tdNo.style.textAlign = 'center';
    tdNo.style.width = '30px';
    tdNo.style.fontSize = '0.65rem';
    tr.appendChild(tdNo);
    
    // Product - Clickable to open form
    const tdProduct = document.createElement('td');
    const productDiv = document.createElement('div');
    productDiv.className = 'product-cell' + (data.product ? '' : ' empty');
    productDiv.textContent = data.product || 'Tap';
    productDiv.onclick = (e) => {
        e.stopPropagation();
        openFormModal(data.id);
    };
    tdProduct.appendChild(productDiv);
    tr.appendChild(tdProduct);
    
    // Process - Clickable to open form
    const tdProcess = document.createElement('td');
    const processDiv = document.createElement('div');
    processDiv.className = 'process-cell' + (data.process ? '' : ' empty');
    processDiv.textContent = data.process || 'Tap';
    processDiv.onclick = (e) => {
        e.stopPropagation();
        openFormModal(data.id);
    };
    tdProcess.appendChild(processDiv);
    tr.appendChild(tdProcess);
    
    // Start Time
    const tdStartTime = document.createElement('td');
    const startSpan = document.createElement('span');
    startSpan.className = 'time-display';
    startSpan.textContent = data.startTime || '--:--';
    startSpan.id = `startTime-${data.id}`;
    tdStartTime.appendChild(startSpan);
    tr.appendChild(tdStartTime);
    
    // End Time
    const tdEndTime = document.createElement('td');
    tdEndTime.id = `endTime-${data.id}`;
    
    const endTimeContainer = document.createElement('div');
    endTimeContainer.style.display = 'flex';
    endTimeContainer.style.flexDirection = 'column';
    endTimeContainer.style.gap = '2px';
    endTimeContainer.style.alignItems = 'center';
    
    const endTimeDisplay = document.createElement('span');
    endTimeDisplay.className = 'time-display';
    endTimeDisplay.textContent = data.endTime || '--:--';
    endTimeDisplay.id = `endTimeDisplay-${data.id}`;
    endTimeContainer.appendChild(endTimeDisplay);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '2px';
    buttonContainer.style.width = '100%';
    
    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.className = 'btn-table btn-stop';
    stopBtn.onclick = (e) => {
        e.stopPropagation();
        stopTimer(data.id);
    };
    buttonContainer.appendChild(stopBtn);
    
    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = data.isPaused ? 'Resume' : 'Pause';
    pauseBtn.className = `btn-table ${data.isPaused ? 'btn-resume' : 'btn-pause'}`;
    pauseBtn.onclick = (e) => {
        e.stopPropagation();
        togglePause(data.id);
    };
    buttonContainer.appendChild(pauseBtn);
    
    endTimeContainer.appendChild(buttonContainer);
    tdEndTime.appendChild(endTimeContainer);
    tr.appendChild(tdEndTime);
    
    // Paused Time
    const tdPaused = document.createElement('td');
    const pausedDisplay = document.createElement('span');
    pausedDisplay.className = 'paused-display';
    pausedDisplay.id = `pausedDisplay-${data.id}`;
    pausedDisplay.textContent = formatPausedTimeDisplay(data.pausedTime || 0);
    tdPaused.appendChild(pausedDisplay);
    tr.appendChild(tdPaused);
    
    // Action
    const tdAction = document.createElement('td');
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-cell';
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = '✎';
    editBtn.className = 'btn-table btn-edit';
    editBtn.title = 'Edit';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        openFormModal(data.id);
    };
    actionDiv.appendChild(editBtn);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteRow(data.id);
    };
    actionDiv.appendChild(deleteBtn);
    
    tdAction.appendChild(actionDiv);
    tr.appendChild(tdAction);
    
    tbody.appendChild(tr);
    
    // If it was paused, restart the timer
    if (data.isPaused && !data.isStopped) {
        startPauseTimer(data.id);
    }
}

// Open form modal for editing
function openFormModal(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    editingRowId = rowId;
    const modal = document.getElementById('formModal');
    const title = document.getElementById('formModalTitle');
    
    title.textContent = `Entry #${row.id} - ${row.product || 'New Entry'}`;
    
    document.getElementById('formSection').value = row.section || '';
    document.getElementById('formProduct').value = row.product || '';
    document.getElementById('formSKU').value = row.sku || '';
    document.getElementById('formProcess').value = row.process || '';
    document.getElementById('formWorkUnit').value = row.workUnit || '';
    document.getElementById('formOprt').value = row.oprt || '';
    document.getElementById('formMTE').value = row.mte || '';
    document.getElementById('formRemarks').value = row.remarks || '';
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        document.getElementById('formSection').focus();
    }, 200);
}

// Close form modal
function closeFormModal() {
    const modal = document.getElementById('formModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    editingRowId = null;
}

// Save form data
function saveFormData() {
    if (!editingRowId) return;
    
    const row = rows.find(r => r.id === editingRowId);
    if (!row) return;
    
    row.section = document.getElementById('formSection').value.trim();
    row.product = document.getElementById('formProduct').value.trim();
    row.sku = document.getElementById('formSKU').value.trim();
    row.process = document.getElementById('formProcess').value.trim();
    row.workUnit = document.getElementById('formWorkUnit').value.trim();
    row.oprt = document.getElementById('formOprt').value.trim();
    row.mte = document.getElementById('formMTE').value.trim();
    row.remarks = document.getElementById('formRemarks').value.trim();
    
    updateRowDisplay(row.id);
    saveData();
    closeFormModal();
}

// Update row display after form save
function updateRowDisplay(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    const rowElement = document.getElementById(`row-${rowId}`);
    if (!rowElement) return;
    
    const cells = rowElement.querySelectorAll('td');
    
    const productDiv = cells[1]?.querySelector('.product-cell');
    if (productDiv) {
        productDiv.textContent = row.product || 'Tap';
        productDiv.className = 'product-cell' + (row.product ? '' : ' empty');
    }
    
    const processDiv = cells[2]?.querySelector('.process-cell');
    if (processDiv) {
        processDiv.textContent = row.process || 'Tap';
        processDiv.className = 'process-cell' + (row.process ? '' : ' empty');
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
    
    if (pausedTimers[rowId]) {
        clearInterval(pausedTimers[rowId]);
        delete pausedTimers[rowId];
    }
    
    const endDisplay = document.getElementById(`endTimeDisplay-${rowId}`);
    if (endDisplay) endDisplay.textContent = timeStr;
    
    const rowElement = document.getElementById(`row-${rowId}`);
    if (rowElement) {
        const buttons = rowElement.querySelectorAll('.btn-table');
        buttons.forEach(btn => {
            if (!btn.classList.contains('btn-edit')) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });
    }
    
    const pausedDisplay = document.getElementById(`pausedDisplay-${rowId}`);
    if (pausedDisplay) {
        pausedDisplay.textContent = formatPausedTimeDisplay(row.pausedTime || 0);
    }
    
    // Also update any count transactions linked to this row
    countTransactions.forEach((transaction, index) => {
        if (transaction.rowId === rowId && !transaction.isStopped) {
            transaction.endTime = timeStr;
            transaction.isStopped = true;
            transaction.isPaused = false;
            if (countPausedTimers[transaction.id]) {
                clearInterval(countPausedTimers[transaction.id]);
                delete countPausedTimers[transaction.id];
            }
            updateCountRowDisplay(index);
        }
    });
    
    saveData();
}

// Toggle pause
function togglePause(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row || row.isStopped) return;
    
    const rowElement = document.getElementById(`row-${rowId}`);
    if (!rowElement) return;
    
    const pauseBtn = rowElement.querySelector('.btn-table.btn-pause, .btn-table.btn-resume');
    
    if (row.isPaused) {
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
        if (pauseBtn) {
            pauseBtn.textContent = 'Pause';
            pauseBtn.className = 'btn-table btn-pause';
        }
        
        // Also resume any count transactions linked to this row
        countTransactions.forEach((transaction, index) => {
            if (transaction.rowId === rowId && transaction.isPaused && !transaction.isStopped) {
                transaction.isPaused = false;
                if (countPausedTimers[transaction.id]) {
                    clearInterval(countPausedTimers[transaction.id]);
                    delete countPausedTimers[transaction.id];
                }
                if (transaction.pauseStartTime) {
                    const pauseDuration = (Date.now() - transaction.pauseStartTime) / 1000;
                    transaction.pausedTime = (transaction.pausedTime || 0) + pauseDuration;
                    transaction.pauseStartTime = null;
                }
                updateCountRowDisplay(index);
            }
        });
    } else {
        row.isPaused = true;
        row.pauseStartTime = Date.now();
        if (pauseBtn) {
            pauseBtn.textContent = 'Resume';
            pauseBtn.className = 'btn-table btn-resume';
        }
        startPauseTimer(rowId);
        
        // Also pause any count transactions linked to this row
        countTransactions.forEach((transaction, index) => {
            if (transaction.rowId === rowId && !transaction.isPaused && !transaction.isStopped) {
                transaction.isPaused = true;
                transaction.pauseStartTime = Date.now();
                updateCountRowDisplay(index);
                startCountPauseTimer(index);
            }
        });
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
                display.textContent = formatPausedTimeDisplay(totalPaused);
            }
        }
    }, 1000);
}

// Format paused time for display (HH:MM:SS)
function formatPausedTimeDisplay(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Format paused time for CSV (MM.SS or HMM.SS)
function formatPausedTimeCSV(seconds) {
    const totalMinutes = seconds / 60;
    const mins = Math.floor(totalMinutes);
    const secs = Math.floor(seconds % 60);
    // Format: minutes.seconds (e.g., 5.49 for 5min 49sec, 70.30 for 1hr 10min 30sec)
    return `${mins}.${String(secs).padStart(2, '0')}`;
}

// Delete row
function deleteRow(rowId) {
    if (confirm('Delete this entry?')) {
        if (pausedTimers[rowId]) {
            clearInterval(pausedTimers[rowId]);
            delete pausedTimers[rowId];
        }
        
        rows = rows.filter(r => r.id !== rowId);
        const rowElement = document.getElementById(`row-${rowId}`);
        if (rowElement) {
            rowElement.remove();
        }
        
        // Remove any count transactions linked to this row
        countTransactions = countTransactions.filter(t => t.rowId !== rowId);
        
        saveData();
        renumberAndRender();
    }
}

// Clear history
function clearHistory() {
    if (confirm('Clear all history and notes?')) {
        Object.keys(pausedTimers).forEach(key => {
            clearInterval(pausedTimers[key]);
            delete pausedTimers[key];
        });
        
        rows = [];
        rowCounter = 0;
        document.getElementById('tableBody').innerHTML = '';
        
        notes = '';
        notesLastSaved = null;
        
        countTransactions = [];
        Object.keys(countPausedTimers).forEach(key => {
            clearInterval(countPausedTimers[key]);
            delete countPausedTimers[key];
        });
        countRowCounter = 0;
        
        saveData();
    }
}

// ============ COUNT FUNCTIONALITY - COMPACT TABLE ============

// Open count modal
function openCountModal() {
    const modal = document.getElementById('countModal');
    const tbody = document.getElementById('countTableBody');
    
    // Clear tbody
    tbody.innerHTML = '';
    
    // Load saved count transactions
    if (countTransactions.length === 0) {
        // Add default empty transaction
        addCountRow();
    } else {
        // Render all saved transactions
        countTransactions.forEach((transaction, index) => {
            renderCountRow(index, transaction);
            if (transaction.isPaused && !transaction.isStopped) {
                startCountPauseTimer(index);
            }
        });
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close count modal
function closeCountModal() {
    const modal = document.getElementById('countModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Add count row
function addCountRow() {
    const transaction = {
        id: Date.now(),
        rowId: '',
        countValue: 0,
        startTime: '',
        endTime: '',
        pausedTime: 0,
        isPaused: false,
        isStopped: false,
        pauseStartTime: null
    };
    
    countTransactions.push(transaction);
    const index = countTransactions.length - 1;
    renderCountRow(index, transaction);
    saveData();
}

// Render count row (compact like main table)
function renderCountRow(index, transaction) {
    const tbody = document.getElementById('countTableBody');
    
    const tr = document.createElement('tr');
    tr.id = `count-row-${transaction.id}`;
    tr.dataset.index = index;
    
    // # column
    const tdNo = document.createElement('td');
    tdNo.textContent = index + 1;
    tdNo.style.fontWeight = '600';
    tdNo.style.textAlign = 'center';
    tdNo.style.width = '30px';
    tdNo.style.fontSize = '0.65rem';
    tr.appendChild(tdNo);
    
    // Transaction select column
    const tdSelect = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'count-transaction-select';
    select.id = `count-select-${transaction.id}`;
    select.dataset.index = index;
    
    // Populate with available rows
    const availableRows = rows.filter(r => r.startTime);
    if (availableRows.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No rows';
        select.appendChild(option);
    } else {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Select #';
        select.appendChild(emptyOption);
        
        availableRows.forEach(row => {
            const option = document.createElement('option');
            option.value = row.id;
            option.textContent = `#${row.id}`;
            if (row.id === transaction.rowId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
    
    select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        const selectedId = parseInt(e.target.value) || '';
        countTransactions[idx].rowId = selectedId;
        updateCountRowFromMain(idx);
        saveData();
    });
    
    tdSelect.appendChild(select);
    tr.appendChild(tdSelect);
    
    // Count value column with +/- controls
    const tdCount = document.createElement('td');
    const countControl = document.createElement('div');
    countControl.className = 'count-value-control-compact';
    
    const minusBtn = document.createElement('button');
    minusBtn.className = 'count-value-btn-compact minus';
    minusBtn.textContent = '−';
    minusBtn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(tr.dataset.index);
        countTransactions[idx].countValue = Math.max(0, countTransactions[idx].countValue - 1);
        const display = document.getElementById(`count-value-${transaction.id}`);
        if (display) display.textContent = countTransactions[idx].countValue || 0;
        saveData();
    };
    countControl.appendChild(minusBtn);
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'count-value-display-compact';
    valueDisplay.id = `count-value-${transaction.id}`;
    valueDisplay.textContent = transaction.countValue || 0;
    countControl.appendChild(valueDisplay);
    
    const plusBtn = document.createElement('button');
    plusBtn.className = 'count-value-btn-compact plus';
    plusBtn.textContent = '+';
    plusBtn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(tr.dataset.index);
        countTransactions[idx].countValue = (countTransactions[idx].countValue || 0) + 1;
        const display = document.getElementById(`count-value-${transaction.id}`);
        if (display) display.textContent = countTransactions[idx].countValue || 0;
        saveData();
    };
    countControl.appendChild(plusBtn);
    
    tdCount.appendChild(countControl);
    tr.appendChild(tdCount);
    
    // Start Time
    const tdStart = document.createElement('td');
    const startSpan = document.createElement('span');
    startSpan.className = 'count-time-display';
    startSpan.id = `count-start-${transaction.id}`;
    startSpan.textContent = transaction.startTime || '--:--';
    tdStart.appendChild(startSpan);
    tr.appendChild(tdStart);
    
    // End Time with Stop button
    const tdEnd = document.createElement('td');
    const endContainer = document.createElement('div');
    endContainer.style.display = 'flex';
    endContainer.style.flexDirection = 'column';
    endContainer.style.gap = '2px';
    endContainer.style.alignItems = 'center';
    
    const endSpan = document.createElement('span');
    endSpan.className = 'count-time-display';
    endSpan.id = `count-end-${transaction.id}`;
    endSpan.textContent = transaction.endTime || '--:--';
    endContainer.appendChild(endSpan);
    
    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn-count-timing stop';
    stopBtn.textContent = 'Stop';
    stopBtn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(tr.dataset.index);
        stopCountTimer(idx);
    };
    endContainer.appendChild(stopBtn);
    
    tdEnd.appendChild(endContainer);
    tr.appendChild(tdEnd);
    
    // Paused Time with Pause/Resume button
    const tdPaused = document.createElement('td');
    const pausedContainer = document.createElement('div');
    pausedContainer.style.display = 'flex';
    pausedContainer.style.flexDirection = 'column';
    pausedContainer.style.gap = '2px';
    pausedContainer.style.alignItems = 'center';
    
    const pausedSpan = document.createElement('span');
    pausedSpan.className = 'count-paused-display';
    pausedSpan.id = `count-paused-${transaction.id}`;
    pausedSpan.textContent = formatPausedTimeDisplay(transaction.pausedTime || 0);
    pausedContainer.appendChild(pausedSpan);
    
    const pauseBtn = document.createElement('button');
    pauseBtn.className = `btn-count-timing ${transaction.isPaused ? 'resume' : 'pause'}`;
    pauseBtn.textContent = transaction.isPaused ? 'Resume' : 'Pause';
    pauseBtn.id = `count-pause-btn-${transaction.id}`;
    pauseBtn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(tr.dataset.index);
        toggleCountPause(idx);
    };
    pausedContainer.appendChild(pauseBtn);
    
    tdPaused.appendChild(pausedContainer);
    tr.appendChild(tdPaused);
    
    // Action - Delete button
    const tdAction = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'count-delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteCountRow(parseInt(tr.dataset.index));
    };
    tdAction.appendChild(deleteBtn);
    tr.appendChild(tdAction);
    
    tbody.appendChild(tr);
    
    // If transaction is stopped, disable buttons
    if (transaction.isStopped) {
        const btns = tr.querySelectorAll('.btn-count-timing');
        btns.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }
}

// Update count row from main transaction
function updateCountRowFromMain(index) {
    const transaction = countTransactions[index];
    if (!transaction) return;
    
    const row = rows.find(r => r.id === transaction.rowId);
    if (row) {
        transaction.startTime = row.startTime || '';
        transaction.endTime = row.endTime || '';
        transaction.pausedTime = row.pausedTime || 0;
        transaction.isStopped = row.isStopped || false;
        transaction.isPaused = row.isPaused || false;
        transaction.pauseStartTime = row.pauseStartTime || null;
        
        // Update displays
        const startSpan = document.getElementById(`count-start-${transaction.id}`);
        if (startSpan) startSpan.textContent = transaction.startTime || '--:--';
        
        const endSpan = document.getElementById(`count-end-${transaction.id}`);
        if (endSpan) endSpan.textContent = transaction.endTime || '--:--';
        
        const pausedSpan = document.getElementById(`count-paused-${transaction.id}`);
        if (pausedSpan) pausedSpan.textContent = formatPausedTimeDisplay(transaction.pausedTime || 0);
        
        // Update pause button
        const pauseBtn = document.getElementById(`count-pause-btn-${transaction.id}`);
        if (pauseBtn) {
            if (transaction.isPaused && !transaction.isStopped) {
                pauseBtn.textContent = 'Resume';
                pauseBtn.className = 'btn-count-timing resume';
            } else {
                pauseBtn.textContent = 'Pause';
                pauseBtn.className = 'btn-count-timing pause';
            }
        }
        
        // If row is stopped, disable controls
        const tr = document.getElementById(`count-row-${transaction.id}`);
        if (tr && transaction.isStopped) {
            const btns = tr.querySelectorAll('.btn-count-timing');
            btns.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
        }
        
        // Start pause timer if needed
        if (transaction.isPaused && !transaction.isStopped) {
            startCountPauseTimer(index);
        } else if (countPausedTimers[transaction.id]) {
            clearInterval(countPausedTimers[transaction.id]);
            delete countPausedTimers[transaction.id];
        }
    } else {
        // Reset if no row selected
        transaction.startTime = '';
        transaction.endTime = '';
        transaction.pausedTime = 0;
        transaction.isStopped = false;
        transaction.isPaused = false;
        transaction.pauseStartTime = null;
        
        const startSpan = document.getElementById(`count-start-${transaction.id}`);
        if (startSpan) startSpan.textContent = '--:--';
        
        const endSpan = document.getElementById(`count-end-${transaction.id}`);
        if (endSpan) endSpan.textContent = '--:--';
        
        const pausedSpan = document.getElementById(`count-paused-${transaction.id}`);
        if (pausedSpan) pausedSpan.textContent = '00:00:00';
        
        const pauseBtn = document.getElementById(`count-pause-btn-${transaction.id}`);
        if (pauseBtn) {
            pauseBtn.textContent = 'Pause';
            pauseBtn.className = 'btn-count-timing pause';
            pauseBtn.disabled = false;
            pauseBtn.style.opacity = '1';
            pauseBtn.style.cursor = 'pointer';
        }
    }
    
    saveData();
}

// Update count row display (for timer updates)
function updateCountRowDisplay(index) {
    const transaction = countTransactions[index];
    if (!transaction) return;
    
    const startSpan = document.getElementById(`count-start-${transaction.id}`);
    if (startSpan) startSpan.textContent = transaction.startTime || '--:--';
    
    const endSpan = document.getElementById(`count-end-${transaction.id}`);
    if (endSpan) endSpan.textContent = transaction.endTime || '--:--';
    
    const pausedSpan = document.getElementById(`count-paused-${transaction.id}`);
    if (pausedSpan) pausedSpan.textContent = formatPausedTimeDisplay(transaction.pausedTime || 0);
    
    const pauseBtn = document.getElementById(`count-pause-btn-${transaction.id}`);
    if (pauseBtn) {
        if (transaction.isPaused && !transaction.isStopped) {
            pauseBtn.textContent = 'Resume';
            pauseBtn.className = 'btn-count-timing resume';
        } else if (!transaction.isStopped) {
            pauseBtn.textContent = 'Pause';
            pauseBtn.className = 'btn-count-timing pause';
        }
    }
}

// Stop count timer
function stopCountTimer(index) {
    const transaction = countTransactions[index];
    if (!transaction || transaction.isStopped) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    transaction.endTime = timeStr;
    transaction.isStopped = true;
    transaction.isPaused = false;
    
    if (countPausedTimers[transaction.id]) {
        clearInterval(countPausedTimers[transaction.id]);
        delete countPausedTimers[transaction.id];
    }
    
    // Update display
    const endSpan = document.getElementById(`count-end-${transaction.id}`);
    if (endSpan) endSpan.textContent = timeStr;
    
    const pauseBtn = document.getElementById(`count-pause-btn-${transaction.id}`);
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.style.opacity = '0.5';
        pauseBtn.style.cursor = 'not-allowed';
    }
    
    // Also stop the main row if it exists
    if (transaction.rowId) {
        const mainRow = rows.find(r => r.id === transaction.rowId);
        if (mainRow && !mainRow.isStopped) {
            stopTimer(transaction.rowId);
        }
    }
    
    saveData();
}

// Toggle count pause
function toggleCountPause(index) {
    const transaction = countTransactions[index];
    if (!transaction || transaction.isStopped) return;
    
    const pauseBtn = document.getElementById(`count-pause-btn-${transaction.id}`);
    
    if (transaction.isPaused) {
        transaction.isPaused = false;
        if (countPausedTimers[transaction.id]) {
            clearInterval(countPausedTimers[transaction.id]);
            delete countPausedTimers[transaction.id];
        }
        if (transaction.pauseStartTime) {
            const pauseDuration = (Date.now() - transaction.pauseStartTime) / 1000;
            transaction.pausedTime = (transaction.pausedTime || 0) + pauseDuration;
            transaction.pauseStartTime = null;
        }
        if (pauseBtn) {
            pauseBtn.textContent = 'Pause';
            pauseBtn.className = 'btn-count-timing pause';
        }
        
        // Also resume main row if it exists and is paused
        if (transaction.rowId) {
            const mainRow = rows.find(r => r.id === transaction.rowId);
            if (mainRow && mainRow.isPaused) {
                togglePause(transaction.rowId);
            }
        }
    } else {
        transaction.isPaused = true;
        transaction.pauseStartTime = Date.now();
        if (pauseBtn) {
            pauseBtn.textContent = 'Resume';
            pauseBtn.className = 'btn-count-timing resume';
        }
        startCountPauseTimer(index);
        
        // Also pause main row if it exists and is not paused/stopped
        if (transaction.rowId) {
            const mainRow = rows.find(r => r.id === transaction.rowId);
            if (mainRow && !mainRow.isPaused && !mainRow.isStopped) {
                togglePause(transaction.rowId);
            }
        }
    }
    
    saveData();
}

// Start count pause timer
function startCountPauseTimer(index) {
    const transaction = countTransactions[index];
    if (!transaction) return;
    
    if (countPausedTimers[transaction.id]) {
        clearInterval(countPausedTimers[transaction.id]);
    }
    
    countPausedTimers[transaction.id] = setInterval(() => {
        const trans = countTransactions.find(t => t.id === transaction.id);
        if (trans && trans.isPaused && trans.pauseStartTime) {
            const elapsed = (Date.now() - trans.pauseStartTime) / 1000;
            const totalPaused = (trans.pausedTime || 0) + elapsed;
            const display = document.getElementById(`count-paused-${trans.id}`);
            if (display) {
                display.textContent = formatPausedTimeDisplay(totalPaused);
            }
        }
    }, 1000);
}

// Delete count row
function deleteCountRow(index) {
    if (countTransactions.length <= 1) {
        alert('At least one count transaction is required.');
        return;
    }
    
    if (confirm('Remove this count transaction?')) {
        const transaction = countTransactions[index];
        if (countPausedTimers[transaction.id]) {
            clearInterval(countPausedTimers[transaction.id]);
            delete countPausedTimers[transaction.id];
        }
        
        countTransactions.splice(index, 1);
        saveData();
        
        // Re-render all count rows
        const tbody = document.getElementById('countTableBody');
        tbody.innerHTML = '';
        countTransactions.forEach((trans, idx) => {
            renderCountRow(idx, trans);
            if (trans.isPaused && !trans.isStopped) {
                startCountPauseTimer(idx);
            }
        });
    }
}

// Save count transactions
function saveCountTransactions() {
    // Validate each transaction has a row selected
    let hasError = false;
    countTransactions.forEach((transaction, index) => {
        if (!transaction.rowId) {
            hasError = true;
            alert(`Count #${index + 1}: Please select a transaction #.`);
            return;
        }
    });
    
    if (hasError) return;
    
    // Save count values to remarks
    countTransactions.forEach(transaction => {
        if (transaction.rowId && transaction.countValue > 0) {
            const row = rows.find(r => r.id === transaction.rowId);
            if (row) {
                const countText = `"${transaction.countValue}" Count`;
                if (row.remarks) {
                    // Append to existing remarks with separator
                    if (!row.remarks.includes(countText)) {
                        row.remarks = row.remarks + ' | ' + countText;
                    }
                } else {
                    row.remarks = countText;
                }
                // Update row display
                updateRowDisplay(row.id);
            }
        }
    });
    
    // Clear count transactions after saving
    countTransactions = [];
    const tbody = document.getElementById('countTableBody');
    tbody.innerHTML = '';
    // Add a new empty row
    addCountRow();
    
    saveData();
    closeCountModal();
    alert('Count transactions saved to Remarks!');
}

// ============ END COUNT FUNCTIONALITY ============

// Export CSV
function exportCSV() {
    let csvRows = [];
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    // Add NOTES section with each line as a separate row
    if (notes && notes.trim()) {
        csvRows.push(['=== NOTES ===']);
        const noteLines = notes.split('\n');
        noteLines.forEach(line => {
            if (line.trim()) {
                csvRows.push([`"${line.replace(/"/g, '""')}"`]);
            } else {
                csvRows.push(['']);
            }
        });
        csvRows.push([]); // Empty row as separator
    }
    
    // Add JOURNAL DATA section
    if (rows.length > 0) {
        if (csvRows.length > 0) {
            csvRows.push(['=== JOURNAL DATA ===']);
        }
        
        // Headers with Date
        const headers = ['Date', 'No.', 'Section', 'Product', 'SKU', 'Process', 'Oprt', 'MTE', 'Work Unit', 'Start Time', 'End Time', 'Paused Time', 'Remarks'];
        csvRows.push(headers);
        
        // Data rows
        rows.forEach(row => {
            const rowData = [
                dateStr,
                row.id,
                `"${(row.section || '').replace(/"/g, '""')}"`,
                `"${(row.product || '').replace(/"/g, '""')}"`,
                `"${(row.sku || '').replace(/"/g, '""')}"`,
                `"${(row.process || '').replace(/"/g, '""')}"`,
                `"${(row.oprt || '').replace(/"/g, '""')}"`,
                `"${(row.mte || '').replace(/"/g, '""')}"`,
                `"${(row.workUnit || '').replace(/"/g, '""')}"`,
                `"${row.startTime || ''}"`,
                `"${row.endTime || ''}"`,
                `"${formatPausedTimeCSV(row.pausedTime || 0)}"`,
                `"${(row.remarks || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(rowData);
        });
    }
    
    if (csvRows.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Convert to CSV string
    const csvString = csvRows.map(row => row.join(',')).join('\n');
    
    // Create download
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `journal_${today.toISOString().slice(0,10)}.csv`);
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
            rowCounter: rowCounter,
            notes: notes,
            notesLastSaved: notesLastSaved ? notesLastSaved.toISOString() : null,
            countTransactions: countTransactions,
            countRowCounter: countRowCounter
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
            notes = parsed.notes || '';
            notesLastSaved = parsed.notesLastSaved ? new Date(parsed.notesLastSaved) : null;
            countTransactions = parsed.countTransactions || [];
            countRowCounter = parsed.countRowCounter || 0;
            
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            rows.forEach(row => {
                renderRow(row);
                if (row.isPaused && !row.isStopped) {
                    startPauseTimer(row.id);
                }
            });
            
            updateLastSavedInfo();
        }
    } catch (e) {
        console.error('Error loading data:', e);
        rows = [];
        rowCounter = 0;
        notes = '';
        notesLastSaved = null;
        countTransactions = [];
        countRowCounter = 0;
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
        countTransactions.forEach((transaction, index) => {
            if (transaction.isPaused && !transaction.isStopped && transaction.pauseStartTime) {
                startCountPauseTimer(index);
            }
        });
    }
});
