export function errorHandler(err, _req, res, _next) {
  const status = Number.isInteger(err.status) ? err.status : 502;
  const safeMessage = status < 500 ? err.message : 'The operation could not be completed. Check the URL and try again.';
  res.status(status).json({ error: safeMessage });
}
