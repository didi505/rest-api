const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/tasks.json');

// Datei laden
function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return raw ? JSON.parse(raw) : [];
}

// Datei speichern
function save(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}

// Erlaubte Status-Übergänge
const TRANSITIONS = {
  backlog:     ['todo'],
  todo:        ['in_progress'],
  in_progress: ['review', 'done'],
  review:      ['testing', 'done', 'in_progress'],
  testing:     ['done', 'in_progress'],
  done:        [],
};

// Neuen Task erstellen
function create(data) {
  const tasks = load();
  const task = {
    id:            uuidv4(),
    title:         data.title,
    description:   data.description || '',
    status:        'backlog',
    priority:      data.priority || 'medium',
    assignee:      data.assignee || null,
    tags:          data.tags || [],
    storyPoints:   data.storyPoints || 0,
    createdAt:     new Date().toISOString(),
    updatedAt:     new Date().toISOString(),
    startedAt:     null,
    completedAt:   null,
    statusHistory: [{ status: 'backlog', timestamp: new Date().toISOString() }],
  };
  tasks.push(task);
  save(tasks);
  return task;
}

// Alle Tasks abrufen
function findAll() {
  return load();
}

// Einzelnen Task abrufen
function findById(id) {
  return load().find(t => t.id === id) || null;
}

// Task aktualisieren
function update(id, data) {
  const tasks = load();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...data, updatedAt: new Date().toISOString() };
  save(tasks);
  return tasks[index];
}

// Status-Übergang
function transition(id, newStatus) {
  const tasks = load();
  const task = tasks.find(t => t.id === id);
  if (!task) return null;

  const allowed = TRANSITIONS[task.status] || [];
  if (!allowed.includes(newStatus)) return { error: `Übergang von '${task.status}' nach '${newStatus}' nicht erlaubt` };

  task.status = newStatus;
  task.updatedAt = new Date().toISOString();
  task.statusHistory.push({ status: newStatus, timestamp: new Date().toISOString() });

  if (newStatus === 'in_progress' && !task.startedAt) task.startedAt = new Date().toISOString();
  if (newStatus === 'done') task.completedAt = new Date().toISOString();

  save(tasks);
  return task;
}

// Task löschen
function remove(id) {
  const tasks = load();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  save(tasks);
  return true;
}

module.exports = { create, findAll, findById, update, transition, remove, TRANSITIONS };
