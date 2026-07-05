const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const tasksRouter = require('./routes/tasks');
const boardRouter = require('./routes/board');

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ name: 'Tasks-API', version: '1.0.0' });
});

app.use('/api/tasks', tasksRouter);
app.use('/api/board', boardRouter);

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
