/**
 * Wraps an async route handler and forwards any thrown error to Express's
 * next(err) so the centralised errorHandler can deal with it.
 * Eliminates the need for try/catch in every controller.
 *
 * Usage:
 *   router.get('/path', protect, asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
