// ====================================================
//  Kanban Board – Frontend
//  Spricht mit der REST-API auf localhost:3000
// ====================================================

const API = '';  // gleicher Server – kein Prefix nötig

// Erlaubte Status-Übergänge (muss mit Backend übereinstimmen)
const TRANSITIONS = {
  backlog:     ['todo'],
  todo:        ['in_progress'],
  in_progress: ['review', 'done'],
  review:      ['testing', 'done', 'in_progress'],
  testing:     ['done', 'in_progress'],
  done:        []
};

const STATUS_LABELS = {
  backlog:     'Backlog',
  todo:        'To Do',
  in_progress: 'In Progress',
  review:      'Review',
  testing:     'Testing',
  done:        'Done'
};

// ---- State ----
let allTasks = [];
let editingTaskId = null;
let draggedTaskId = null;

// ---- DOM Referenzen ----
const modal        = document.getElementById('modal');
const detailModal  = document.getElementById('detailModal');
const metricsBar   = document.getElementById('metricsBar');

// ===================================================
//  INIT
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  loadBoard();

  // Header Buttons
  document.getElementById('btnAddTask').addEventListener('click', openCreateModal);
  document.getElementById('btnMetrics').addEventListener('click', toggleMetrics);

  // Modal Buttons
  document.getElementById('btnCancel').addEventListener('click', closeModal);
  document.getElementById('btnSave').addEventListener('click', saveTask);

  // Detail Modal Buttons
  document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);
  document.getElementById('btnDeleteTask').addEventListener('click', deleteCurrentTask);
  document.getElementById('btnEditTask').addEventListener('click', editCurrentTask);

  // Klick außerhalb → Modal schließen
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });

  // Drag & Drop auf Spalten
  setupColumnDragTargets();
});

// ===================================================
//  API CALLS
// ===================================================
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ===================================================
//  BOARD LADEN
// ===================================================
async function loadBoard() {
  try {
    const data = await apiFetch('/api/board');
    // data ist { backlog: [...], todo: [...], ... }
    allTasks = Object.values(data).flat();
    renderBoard(data);
  } catch (e) {
    showToast('Fehler beim Laden: ' + e.message, 'error');
  }
}

function renderBoard(grouped) {
  const statuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];
  statuses.forEach(status => {
    const col  = document.getElementById('col-' + status);
    const cnt  = document.getElementById('count-' + status);
    const tasks = grouped[status] || [];
    cnt.textContent = tasks.length;
    col.innerHTML = '';
    tasks.forEach(task => col.appendChild(createTaskCard(task)));
  });
}

// ===================================================
//  TASK KARTE ERSTELLEN
// ===================================================
function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card priority-${task.priority}`;
  card.dataset.id = task.id;
  card.draggable = true;

  const date = new Date(task.createdAt).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit'
  });

  card.innerHTML = `
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-meta">
      <span class="priority-badge ${task.priority}">${task.priority}</span>
      <span class="task-date">${date}</span>
    </div>
  `;

  // Klick → Details öffnen
  card.addEventListener('click', () => openDetailModal(task));

  // Drag Events
  card.addEventListener('dragstart', (e) => {
    draggedTaskId = task.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedTaskId = null;
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
  });

  return card;
}

// ===================================================
//  DRAG & DROP – Spalten als Drop-Ziel
// ===================================================
function setupColumnDragTargets() {
  document.querySelectorAll('.column').forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const targetStatus = col.dataset.status;
      if (!draggedTaskId) return;

      const task = allTasks.find(t => t.id === draggedTaskId);
      if (!task || task.status === targetStatus) return;

      // Prüfen ob Übergang erlaubt
      const allowed = TRANSITIONS[task.status] || [];
      if (!allowed.includes(targetStatus)) {
        showToast(`❌ Übergang von "${STATUS_LABELS[task.status]}" nach "${STATUS_LABELS[targetStatus]}" nicht erlaubt`, 'error');
        return;
      }

      try {
        await apiFetch(`/api/tasks/${draggedTaskId}/transition`, {
          method: 'PATCH',
          body: JSON.stringify({ status: targetStatus })
        });
        showToast(`✅ "${task.title}" → ${STATUS_LABELS[targetStatus]}`, 'success');
        await loadBoard();
        if (!metricsBar.classList.contains('hidden')) loadMetrics();
      } catch (e) {
        showToast('Fehler: ' + e.message, 'error');
      }
    });
  });
}

// ===================================================
//  METRIKEN
// ===================================================
async function toggleMetrics() {
  if (metricsBar.classList.contains('hidden')) {
    metricsBar.classList.remove('hidden');
    await loadMetrics();
  } else {
    metricsBar.classList.add('hidden');
  }
}

async function loadMetrics() {
  try {
    const data = await apiFetch('/api/board/metrics');
    const m = data.metrics;

    document.getElementById('metCycleTime').textContent =
      m.averageCycleTime != null ? m.averageCycleTime.toFixed(1) : '–';
    document.getElementById('metLeadTime').textContent =
      m.averageLeadTime != null ? m.averageLeadTime.toFixed(1) : '–';
    document.getElementById('metThroughput').textContent =
      m.throughput != null ? m.throughput : '–';

    const wip = m.wipCurrent;
    document.getElementById('metWip').textContent = wip != null ? wip : '–';

    const wipCard = document.getElementById('wipCard');
    if (wip > 3) {
      wipCard.classList.add('wip-warning');
    } else {
      wipCard.classList.remove('wip-warning');
    }
  } catch (e) {
    showToast('Metriken nicht verfügbar: ' + e.message, 'error');
  }
}

// ===================================================
//  TASK ERSTELLEN / BEARBEITEN MODAL
// ===================================================
function openCreateModal() {
  editingTaskId = null;
  document.getElementById('modalTitle').textContent = 'Neuer Task';
  document.getElementById('inputTitle').value = '';
  document.getElementById('inputDesc').value = '';
  document.getElementById('inputPriority').value = 'medium';
  modal.classList.remove('hidden');
  document.getElementById('inputTitle').focus();
}

function closeModal() {
  modal.classList.add('hidden');
}

async function saveTask() {
  const title    = document.getElementById('inputTitle').value.trim();
  const desc     = document.getElementById('inputDesc').value.trim();
  const priority = document.getElementById('inputPriority').value;

  if (title.length < 3) {
    showToast('Titel muss mindestens 3 Zeichen haben', 'error');
    return;
  }

  try {
    if (editingTaskId) {
      await apiFetch(`/api/tasks/${editingTaskId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, description: desc, priority })
      });
      showToast('✅ Task aktualisiert', 'success');
    } else {
      await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, description: desc, priority })
      });
      showToast('✅ Task erstellt', 'success');
    }
    closeModal();
    await loadBoard();
  } catch (e) {
    showToast('Fehler: ' + e.message, 'error');
  }
}

// ===================================================
//  DETAIL MODAL
// ===================================================
let currentDetailTask = null;

function openDetailModal(task) {
  currentDetailTask = task;

  document.getElementById('detailTitle').textContent = task.title;
  document.getElementById('detailDesc').textContent  = task.description || 'Keine Beschreibung';
  document.getElementById('detailPriority').textContent = task.priority;
  document.getElementById('detailStatus').textContent   = STATUS_LABELS[task.status] || task.status;

  // Transition Buttons
  const btnContainer = document.getElementById('transitionBtns');
  btnContainer.innerHTML = '';
  const allowed = TRANSITIONS[task.status] || [];

  if (allowed.length === 0) {
    btnContainer.innerHTML = '<em style="color:#718096;font-size:0.85rem">Kein weiterer Schritt möglich</em>';
  } else {
    allowed.forEach(nextStatus => {
      const btn = document.createElement('button');
      btn.textContent = '→ ' + STATUS_LABELS[nextStatus];
      btn.addEventListener('click', () => transitionTask(task.id, nextStatus));
      btnContainer.appendChild(btn);
    });
  }

  detailModal.classList.remove('hidden');
}

function closeDetailModal() {
  detailModal.classList.add('hidden');
  currentDetailTask = null;
}

async function transitionTask(id, newStatus) {
  try {
    await apiFetch(`/api/tasks/${id}/transition`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    closeDetailModal();
    showToast(`✅ Status → ${STATUS_LABELS[newStatus]}`, 'success');
    await loadBoard();
    if (!metricsBar.classList.contains('hidden')) loadMetrics();
  } catch (e) {
    showToast('Fehler: ' + e.message, 'error');
  }
}

async function deleteCurrentTask() {
  if (!currentDetailTask) return;
  if (!confirm(`Task "${currentDetailTask.title}" wirklich löschen?`)) return;

  try {
    await apiFetch(`/api/tasks/${currentDetailTask.id}`, { method: 'DELETE' });
    showToast('🗑 Task gelöscht', 'success');
    closeDetailModal();
    await loadBoard();
  } catch (e) {
    showToast('Fehler: ' + e.message, 'error');
  }
}

function editCurrentTask() {
  if (!currentDetailTask) return;
  editingTaskId = currentDetailTask.id;
  document.getElementById('modalTitle').textContent = 'Task bearbeiten';
  document.getElementById('inputTitle').value     = currentDetailTask.title;
  document.getElementById('inputDesc').value      = currentDetailTask.description || '';
  document.getElementById('inputPriority').value  = currentDetailTask.priority;
  closeDetailModal();
  modal.classList.remove('hidden');
}

// ===================================================
//  TOAST BENACHRICHTIGUNG
// ===================================================
let toastTimer = null;

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ===================================================
//  HILFSFUNKTIONEN
// ===================================================
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
