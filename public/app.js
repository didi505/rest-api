// ====================================================
//  Kanban Board – Frontend
// ====================================================

const API = '';

const TRANSITIONS = {
  backlog:     ['todo'],
  todo:        ['in_progress'],
  in_progress: ['review', 'done'],
  review:      ['testing', 'done', 'in_progress'],
  testing:     ['done', 'in_progress'],
  done:        []
};

const STATUS_LABELS = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress',
  review: 'Review', testing: 'Testing', done: 'Done'
};

const wipLimits = { backlog: null, todo: 5, in_progress: 3, review: 2, testing: 2, done: null };

let allTasks      = [];
let allAssignees  = [];
let editingTaskId = null;
let draggedTaskId = null;

const modal          = document.getElementById('modal');
const detailModal    = document.getElementById('detailModal');
const assigneeModal  = document.getElementById('assigneeModal');
const metricsBar     = document.getElementById('metricsBar');

// ===================================================
//  INIT
// ===================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadAssignees();
  await loadBoard();

  document.getElementById('btnAddTask').addEventListener('click', openCreateModal);
  document.getElementById('btnMetrics').addEventListener('click', toggleMetrics);
  document.getElementById('btnManageAssignees').addEventListener('click', openAssigneeModal);
  document.getElementById('btnCancel').addEventListener('click', closeModal);
  document.getElementById('btnSave').addEventListener('click', saveTask);
  document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);
  document.getElementById('btnDeleteTask').addEventListener('click', deleteCurrentTask);
  document.getElementById('btnEditTask').addEventListener('click', editCurrentTask);
  document.getElementById('btnCloseAssignees').addEventListener('click', () => assigneeModal.classList.add('hidden'));
  document.getElementById('btnAddAssignee').addEventListener('click', addAssignee);

  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });
  assigneeModal.addEventListener('click', (e) => { if (e.target === assigneeModal) assigneeModal.classList.add('hidden'); });

  setupWipInputs();
  setupColumnDragTargets();
});

// ===================================================
//  API
// ===================================================
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ===================================================
//  ASSIGNEES
// ===================================================
async function loadAssignees() {
  try {
    allAssignees = await apiFetch('/api/assignees');
    rebuildAssigneeSelect();
  } catch (e) {
    console.warn('Assignees konnten nicht geladen werden:', e.message);
  }
}

function rebuildAssigneeSelect() {
  const sel = document.getElementById('inputAssignee');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Niemand —</option>';
  allAssignees.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.name;
    opt.textContent = a.name;
    sel.appendChild(opt);
  });
  if (cur) sel.value = cur;
}

function getAssignee(name) {
  return allAssignees.find(a => a.name === name) || null;
}

function makeAvatar(name, sizeClass = 'avatar-sm') {
  const a = getAssignee(name);
  if (!a) return null;
  const el = document.createElement('div');
  el.className = `avatar ${sizeClass}`;
  el.style.background = a.color;
  el.title = a.name;
  el.textContent = a.initials;
  return el;
}

// Assignee-Modal: Liste anzeigen
function openAssigneeModal() {
  renderAssigneeList();
  document.getElementById('newAssigneeName').value  = '';
  document.getElementById('newAssigneeColor').value = '#f9a8d4';
  assigneeModal.classList.remove('hidden');
}

function renderAssigneeList() {
  const container = document.getElementById('assigneeList');
  container.innerHTML = '';
  if (allAssignees.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">Noch keine Assignees</p>';
    return;
  }
  allAssignees.forEach(a => {
    const row = document.createElement('div');
    row.className = 'assignee-item';
    const av = document.createElement('div');
    av.className = 'avatar avatar-sm';
    av.style.background = a.color;
    av.textContent = a.initials;
    const name = document.createElement('span');
    name.className = 'assignee-item-name';
    name.textContent = a.name;
    const del = document.createElement('button');
    del.className = 'assignee-delete';
    del.title = 'Löschen';
    del.textContent = '✕';
    del.addEventListener('click', async () => {
      await apiFetch(`/api/assignees/${a.id}`, { method: 'DELETE' });
      await loadAssignees();
      renderAssigneeList();
      showToast(`"${a.name}" entfernt`, 'success');
    });
    row.appendChild(av);
    row.appendChild(name);
    row.appendChild(del);
    container.appendChild(row);
  });
}

async function addAssignee() {
  const name  = document.getElementById('newAssigneeName').value.trim();
  const color = document.getElementById('newAssigneeColor').value;
  if (name.length < 2) { showToast('Name muss mind. 2 Zeichen haben', 'error'); return; }
  try {
    await apiFetch('/api/assignees', { method: 'POST', body: JSON.stringify({ name, color }) });
    await loadAssignees();
    renderAssigneeList();
    document.getElementById('newAssigneeName').value = '';
    showToast(`"${name}" hinzugefügt ✅`, 'success');
  } catch (e) {
    showToast('Fehler: ' + e.message, 'error');
  }
}

// ===================================================
//  WIP-LIMITS
// ===================================================
function setupWipInputs() {
  document.querySelectorAll('.wip-input').forEach(input => {
    const col = input.dataset.col;
    input.value = wipLimits[col] !== null ? wipLimits[col] : '';
    input.addEventListener('change', () => {
      const v = parseInt(input.value);
      wipLimits[col] = isNaN(v) || v < 1 ? null : v;
      checkWipLimits();
    });
  });
}

function checkWipLimits() {
  ['backlog','todo','in_progress','review','done'].forEach(status => {
    const col   = document.querySelector(`.column[data-status="${status}"]`);
    const count = allTasks.filter(t => t.status === status).length;
    if (!col) return;
    col.classList.toggle('wip-exceeded', wipLimits[status] !== null && count > wipLimits[status]);
  });
  const ts    = document.querySelector('.testing-section');
  const tCount = allTasks.filter(t => t.status === 'testing').length;
  if (ts) ts.classList.toggle('wip-exceeded', wipLimits.testing !== null && tCount > wipLimits.testing);
}

// ===================================================
//  BOARD
// ===================================================
async function loadBoard() {
  try {
    const data    = await apiFetch('/api/board');
    const grouped = data.board || data;
    allTasks = Object.values(grouped).flat();
    renderBoard(grouped);
    checkWipLimits();
  } catch (e) {
    showToast('Fehler beim Laden: ' + e.message, 'error');
  }
}

function renderBoard(grouped) {
  ['backlog','todo','in_progress','review','done'].forEach(status => {
    const col   = document.getElementById('col-' + status);
    const cnt   = document.getElementById('count-' + status);
    const tasks = grouped[status] || [];
    cnt.textContent = tasks.length;
    col.innerHTML = '';
    tasks.forEach(task => col.appendChild(createTaskCard(task)));
  });

  // Testing
  const testCol = document.getElementById('col-testing');
  const testCnt = document.getElementById('count-testing');
  const testTasks = grouped['testing'] || [];
  testCnt.textContent = testTasks.length;
  testCol.innerHTML = testTasks.length === 0
    ? '<span class="testing-empty">Keine Tasks im Testing</span>'
    : '';
  testTasks.forEach(task => testCol.appendChild(createTaskCard(task)));
}

// ===================================================
//  TASK KARTE
// ===================================================
function createTaskCard(task) {
  const card      = document.createElement('div');
  card.className  = `task-card priority-${task.priority}`;
  card.dataset.id = task.id;
  card.draggable  = true;

  const date    = new Date(task.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const allowed = TRANSITIONS[task.status] || [];
  const next    = allowed[0];

  // Obere Zeile: Titel + Avatar
  const top = document.createElement('div');
  top.className = 'task-card-top';
  const titleEl = document.createElement('div');
  titleEl.className = 'task-title';
  titleEl.textContent = task.title;
  top.appendChild(titleEl);
  if (task.assignee) {
    const av = makeAvatar(task.assignee, 'avatar-sm');
    if (av) top.appendChild(av);
  }
  card.appendChild(top);

  // Meta: Priorität, SP, Datum
  const spBadge = task.storyPoints > 0 ? `<span class="task-sp">⚡ ${task.storyPoints} SP</span>` : '';
  const meta = document.createElement('div');
  meta.className = 'task-meta';
  meta.innerHTML = `
    <span class="priority-badge ${task.priority}">${task.priority}</span>
    ${spBadge}
    <span class="task-date">${date}</span>
  `;
  card.appendChild(meta);

  // Move Button
  if (next) {
    const btn = document.createElement('button');
    btn.className = 'card-move-btn';
    btn.dataset.next = next;
    btn.textContent = `→ ${STATUS_LABELS[next]}`;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await doTransition(task.id, next, task.title);
    });
    card.appendChild(btn);
  } else {
    const done = document.createElement('span');
    done.className = 'card-done-label';
    done.textContent = '✅ Fertig';
    card.appendChild(done);
  }

  card.addEventListener('click', () => openDetailModal(task));
  card.addEventListener('dragstart', (e) => {
    draggedTaskId = task.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedTaskId = null;
    document.querySelectorAll('.column, .testing-section').forEach(c => c.classList.remove('drag-over'));
  });

  return card;
}

// ===================================================
//  DRAG & DROP
// ===================================================
function setupColumnDragTargets() {
  document.querySelectorAll('.column').forEach(col => {
    col.addEventListener('dragover',  (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', ()  => col.classList.remove('drag-over'));
    col.addEventListener('drop',      async (e) => { e.preventDefault(); col.classList.remove('drag-over'); await handleDrop(col.dataset.status); });
  });
  const ts = document.querySelector('.testing-section');
  if (ts) {
    ts.addEventListener('dragover',  (e) => { e.preventDefault(); ts.classList.add('drag-over'); });
    ts.addEventListener('dragleave', ()  => ts.classList.remove('drag-over'));
    ts.addEventListener('drop',      async (e) => { e.preventDefault(); ts.classList.remove('drag-over'); await handleDrop('testing'); });
  }
}

async function handleDrop(targetStatus) {
  if (!draggedTaskId) return;
  const task = allTasks.find(t => t.id === draggedTaskId);
  if (!task || task.status === targetStatus) return;
  if (!(TRANSITIONS[task.status] || []).includes(targetStatus)) {
    showToast(`❌ "${STATUS_LABELS[task.status]}" → "${STATUS_LABELS[targetStatus]}" nicht erlaubt`, 'error');
    return;
  }
  await doTransition(task.id, targetStatus, task.title);
}

// ===================================================
//  TRANSITION
// ===================================================
async function doTransition(id, newStatus, title) {
  try {
    await apiFetch(`/api/tasks/${id}/transition`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`✅ "${title}" → ${STATUS_LABELS[newStatus]}`, 'success');
    await loadBoard();
    if (!metricsBar.classList.contains('hidden')) loadMetrics();
  } catch (e) {
    showToast('Fehler: ' + e.message, 'error');
  }
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
    const m    = data.metrics;
    document.getElementById('metCycleTime').textContent   = m.averageCycleTime != null ? m.averageCycleTime.toFixed(1) : '–';
    document.getElementById('metLeadTime').textContent    = m.averageLeadTime  != null ? m.averageLeadTime.toFixed(1)  : '–';
    document.getElementById('metThroughput').textContent  = m.throughput       != null ? m.throughput                  : '–';
    const wip = m.wipCurrent;
    document.getElementById('metWip').textContent = wip ?? '–';
    document.getElementById('wipCard').classList.toggle('wip-warning', wip > 3);
    // Velocity = SP aller Done-Tasks
    const velocity = allTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);
    document.getElementById('metVelocity').textContent = velocity;
  } catch (e) {
    showToast('Metriken nicht verfügbar: ' + e.message, 'error');
  }
}

// ===================================================
//  TASK MODAL
// ===================================================
function openCreateModal() {
  editingTaskId = null;
  document.getElementById('modalTitle').textContent    = '✨ Neuer Task';
  document.getElementById('inputTitle').value          = '';
  document.getElementById('inputDesc').value           = '';
  document.getElementById('inputPriority').value       = 'medium';
  document.getElementById('inputSP').value             = '0';
  document.getElementById('inputAssignee').value       = '';
  modal.classList.remove('hidden');
  document.getElementById('inputTitle').focus();
}

function closeModal() { modal.classList.add('hidden'); }

async function saveTask() {
  const title    = document.getElementById('inputTitle').value.trim();
  const desc     = document.getElementById('inputDesc').value.trim();
  const priority = document.getElementById('inputPriority').value;
  const sp       = parseInt(document.getElementById('inputSP').value) || 0;
  const assignee = document.getElementById('inputAssignee').value || null;

  if (title.length < 3) { showToast('Titel muss mind. 3 Zeichen haben', 'error'); return; }

  try {
    const body = JSON.stringify({ title, description: desc, priority, storyPoints: sp, assignee });
    if (editingTaskId) {
      await apiFetch(`/api/tasks/${editingTaskId}`, { method: 'PUT', body });
      showToast('✅ Task aktualisiert', 'success');
    } else {
      await apiFetch('/api/tasks', { method: 'POST', body });
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
  document.getElementById('detailTitle').textContent    = task.title;
  document.getElementById('detailDesc').textContent     = task.description || 'Keine Beschreibung';
  document.getElementById('detailPriority').textContent = task.priority;
  document.getElementById('detailStatus').textContent   = STATUS_LABELS[task.status] || task.status;
  document.getElementById('detailSP').textContent       = task.storyPoints || 0;
  document.getElementById('detailAssignee').textContent = task.assignee || '–';

  // Avatar oben rechts
  const avContainer = document.getElementById('detailAvatar');
  avContainer.innerHTML = '';
  avContainer.className = 'avatar avatar-lg';
  avContainer.textContent = '';
  avContainer.style.background = '';
  if (task.assignee) {
    const a = getAssignee(task.assignee);
    if (a) {
      avContainer.style.background = a.color;
      avContainer.textContent = a.initials;
    }
  }

  // Transition Buttons
  const btns = document.getElementById('transitionBtns');
  btns.innerHTML = '';
  const allowed = TRANSITIONS[task.status] || [];
  if (allowed.length === 0) {
    btns.innerHTML = '<em style="color:var(--text-muted);font-size:0.84rem">Kein weiterer Schritt</em>';
  } else {
    allowed.forEach(ns => {
      const btn = document.createElement('button');
      btn.textContent = '→ ' + STATUS_LABELS[ns];
      btn.addEventListener('click', async () => { await doTransition(task.id, ns, task.title); closeDetailModal(); });
      btns.appendChild(btn);
    });
  }

  detailModal.classList.remove('hidden');
}

function closeDetailModal() { detailModal.classList.add('hidden'); currentDetailTask = null; }

async function deleteCurrentTask() {
  if (!currentDetailTask) return;
  if (!confirm(`"${currentDetailTask.title}" wirklich löschen?`)) return;
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
  document.getElementById('modalTitle').textContent    = '✏️ Task bearbeiten';
  document.getElementById('inputTitle').value          = currentDetailTask.title;
  document.getElementById('inputDesc').value           = currentDetailTask.description || '';
  document.getElementById('inputPriority').value       = currentDetailTask.priority;
  document.getElementById('inputSP').value             = currentDetailTask.storyPoints || 0;
  document.getElementById('inputAssignee').value       = currentDetailTask.assignee || '';
  closeDetailModal();
  modal.classList.remove('hidden');
}

// ===================================================
//  TOAST
// ===================================================
let toastTimer = null;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
