function validateTask(req, res, next) {
  const { title, priority } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      error:    'Titel ist erforderlich',
      received: { title },
    });
  }

  if (title.trim().length < 3) {
    return res.status(400).json({
      error: 'Titel muss mindestens 3 Zeichen lang sein',
    });
  }

  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({
      error:    'Priority muss einer von: low, medium, high sein',
      received: priority,
    });
  }

  next();
}

module.exports = { validateTask };
