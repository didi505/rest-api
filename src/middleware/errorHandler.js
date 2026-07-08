module.exports = (err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error:     err.message || 'Interner Server-Fehler',
    status:    err.status || 500,
    path:      req.path,
    timestamp: new Date().toISOString(),
  });
};
