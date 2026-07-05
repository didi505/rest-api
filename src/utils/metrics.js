// Cycle Time: Zeit von 'in_progress' bis 'done' (in Stunden)
function calculateCycleTime(task) {
  if (task.status !== 'done') return null;
  if (!task.startedAt || !task.completedAt) return null;
  const start = new Date(task.startedAt).getTime();
  const end = new Date(task.completedAt).getTime();
  return (end - start) / (1000 * 60 * 60);
}

// Lead Time: Zeit von 'backlog' bis 'done' (in Stunden)
function calculateLeadTime(task) {
  if (task.status !== 'done') return null;
  if (!task.completedAt) return null;
  const start = new Date(task.createdAt).getTime();
  const end = new Date(task.completedAt).getTime();
  return (end - start) / (1000 * 60 * 60);
}

// Throughput: Anzahl erledigter Tasks im Zeitraum
function calculateThroughput(tasks, periodDays = 7) {
  const cutoff = new Date().getTime() - periodDays * 24 * 60 * 60 * 1000;
  return tasks.filter(t => t.status === 'done' && new Date(t.completedAt).getTime() >= cutoff).length;
}

// Hilfsfunktion: Durchschnitt berechnen (null-Werte ignorieren)
function calculateAverage(values) {
  const valid = values.filter(v => v !== null && v !== undefined);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((sum, v) => sum + v, 0) / valid.length) * 100) / 100;
}

module.exports = { calculateCycleTime, calculateLeadTime, calculateThroughput, calculateAverage };
