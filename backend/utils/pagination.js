// Parses ?page=&pageSize= with sane bounds and returns the Sequelize
// offset/limit plus a meta block for the response.
function parsePagination(query, { defaultSize = 25, maxSize = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(query.pageSize, 10) || defaultSize));
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}

function paginationMeta({ page, pageSize }, total) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

module.exports = { parsePagination, paginationMeta };
