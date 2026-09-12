// Express 5 forwards rejected promises to the error handler on its own, but
// wrapping keeps handlers explicit and works the same on Express 4.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
