const errorHandler = (err, req, res, next) => {
  // If CORS blocked the request, return 403 instead of 500
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS: origin not allowed' });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    // Never leak stack traces in production
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { errorHandler };
