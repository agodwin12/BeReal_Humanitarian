// Every response has the same shape so the two frontends can share one client:
//   { success: true,  data, meta? }
//   { success: false, message, errors? }
function ok(res, data, status = 200, meta) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function fail(res, status, message, errors) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

module.exports = { ok, fail };
