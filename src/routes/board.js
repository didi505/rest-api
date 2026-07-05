const express = require('express');
const router = express.Router();
const Task = require('../models/task');
const { calculateCycleTime, calculateLeadTime, calculateThroughput, calculateAverage } = require('../utils/metrics');

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done'];

// GET /api/board — Tasks gruppiert nach Status
router.get('/', (req, res) => {
  const tasks = Task.findAll();
  const board = {};
  const counts = {};

  STATUSES.forEach(s => {
    board[s] = tasks.filter(t => t.status === s);
    counts[s] = board[s].length;
  });

  res.json({ board, counts });
});

// GET /api/board/metrics — Kanban-Metriken
router.get('/metrics', (req, res) => {
  const tasks = Task.findAll();

  const cycleTimes = tasks.map(calculateCycleTime);
  const leadTimes  = tasks.map(calculateLeadTime);
  const wip        = tasks.filter(t => ['in_progress', 'review', 'testing'].includes(t.status)).length;
  const completed  = tasks.filter(t => t.status === 'done').length;

  res.json({
    timestamp: new Date().toISOString(),
    summary: {
      totalTasks:     tasks.length,
      completedTasks: completed,
      wipCurrent:     wip,
    },
    metrics: {
      averageCycleTime: calculateAverage(cycleTimes),  // Stunden
      averageLeadTime:  calculateAverage(leadTimes),   // Stunden
      throughput:       calculateThroughput(tasks),    // Tasks/Woche
      wipCurrent:       wip,
    },
  });
});

module.exports = router;
