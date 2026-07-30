/**
 * A known, expected application error (bad input, not found, forbidden, etc.),
 * as opposed to an unexpected bug. The centralized error handler (§4) uses
 * `isOperational` to decide whether to expose `message` to the client as-is
 * or fall back to a generic message.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.assign(this, extra);
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Wraps an async Express handler so a rejected promise reaches the error handler. */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, asyncHandler };
