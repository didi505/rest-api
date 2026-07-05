const express = require('express');
const router = express.Router();
const Task = require('../models/task');

// GET /api/tasks — Alle Tasks (optional gefiltert)
router.get('/', (req, res) => {
  const { status, assignee } = req.query;
  let tasks = Task.findAll();
  if (status)   tasks = tasks.filter(t => t.status === status);
  if (assignee) tasks = tasks.filter(t => t.assignee === assignee);
  res.json({ count: tasks.length, tasks });
});

// GET /api/tasks/:id — Einzelnen Task abrufen
router.get('/:id', (req, res) => {
  const task = Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task nicht gefunden' });
  res.json(task);
});

// POST /api/tasks — Neuen Task erstellen
router.post('/', (req, res) => {
  const { title, description, priority, assignee, tags, storyPoints } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel ist pflicht' });
  const task = Task.create({ title, description, priority, assignee, tags, storyPoints });
  res.status(201).json(task);
});

// PUT /api/tasks/:id — Task aktualisieren
router.put('/:id', (req, res) => {
  const task = Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task nicht gefunden' });
  const updated = Task.update(req.params.id, req.body);
  res.json(updated);
});

// DELETE /api/tasks/:id — Task löschen
router.delete('/:id', (req, res) => {
  const deleted = Task.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Task nicht gefunden' });
  res.json({ message: 'Task gelöscht' });
});

// PATCH /api/tasks/:id/transition — Status-Übergang
router.patch('/:id/transition', (req, res) => {
  const { status: newStatus } = req.body;
  if (!newStatus) return res.status(400).json({ error: 'Status erforderlich' });

  const task = Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task nicht gefunden' });

  const result = Task.transition(req.params.id, newStatus);
  if (result.error) return res.status(400).json(result);

  res.json({ message: `Task zu '${newStatus}' übergegangen`, task: result });
});

module.exports = router;
