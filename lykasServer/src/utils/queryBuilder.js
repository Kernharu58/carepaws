/**
 * Shared list-query contract (§8.2). Every paginated list endpoint in the API
 * is built against this instead of inventing per-resource query handling.
 *
 * Supported query params:
 *   q             — free-text search across `searchFields` ($or / $regex, case-insensitive)
 *   sortBy/sortOrder — field name + asc|desc (default: -createdAt, newest first)
 *   page/limit    — 1-indexed page, default limit=20, clamped to [1, 100]
 *   includeDeleted — "true" to include soft-deleted rows (gate to admin routes at the controller)
 *   <filterFields> — exact-match filter; the literal string "All" means "no filter"
 *   from/to       — ISO date range applied to createdAt
 */
function buildListQuery(query = {}, { searchFields = [], filterFields = [] } = {}) {
  const filter = {};

  if (query.q && searchFields.length > 0) {
    const regex = new RegExp(escapeRegex(String(query.q)), "i");
    filter.$or = searchFields.map((field) => ({ [field]: regex }));
  }

  for (const field of filterFields) {
    const value = query[field];
    if (value !== undefined && value !== null && value !== "" && value !== "All") {
      filter[field] = value;
    }
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : query.sortOrder === "desc" ? -1 : -1;
  const sort = query.sortBy ? { [sortBy]: sortOrder } : { createdAt: -1 };

  return { filter, sort };
}

function buildPagination(total, page, limit) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  return { total, page: safePage, limit: safeLimit, pages };
}

/** Clamps page/limit from raw query params, used to drive .skip()/.limit(). */
function paginationParams(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { buildListQuery, buildPagination, paginationParams };
