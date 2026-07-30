const { buildListQuery, buildPagination, paginationParams } = require("../../src/utils/queryBuilder");

describe("queryBuilder.buildListQuery", () => {
  it("builds a case-insensitive $or regex filter across searchFields when q is present", () => {
    const { filter } = buildListQuery({ q: "buddy" }, { searchFields: ["name", "breed"] });
    expect(filter.$or).toHaveLength(2);
    expect(filter.$or[0].name.test("Buddy")).toBe(true);
    expect(filter.$or[1].breed.test("BUDDY MIX")).toBe(true);
  });

  it("escapes regex special characters in q so they can't break the query", () => {
    const { filter } = buildListQuery({ q: "a.*(evil)" }, { searchFields: ["name"] });
    expect(() => filter.$or[0].name.test("anything")).not.toThrow();
    expect(filter.$or[0].name.test("a.*(evil)")).toBe(true);
    expect(filter.$or[0].name.test("aXXXevil")).toBe(false);
  });

  it("applies exact-match filters for allowed filterFields", () => {
    const { filter } = buildListQuery({ status: "Available" }, { filterFields: ["status"] });
    expect(filter.status).toBe("Available");
  });

  it("treats the literal string 'All' as no filter", () => {
    const { filter } = buildListQuery({ status: "All" }, { filterFields: ["status"] });
    expect(filter.status).toBeUndefined();
  });

  it("ignores filter fields not present in the allowed list", () => {
    const { filter } = buildListQuery({ role: "super_admin" }, { filterFields: ["status"] });
    expect(filter.role).toBeUndefined();
  });

  it("applies a from/to date range on createdAt", () => {
    const { filter } = buildListQuery({ from: "2026-01-01", to: "2026-02-01" }, {});
    expect(filter.createdAt.$gte).toEqual(new Date("2026-01-01"));
    expect(filter.createdAt.$lte).toEqual(new Date("2026-02-01"));
  });

  it("defaults sort to -createdAt (newest first) when sortBy is not given", () => {
    const { sort } = buildListQuery({}, {});
    expect(sort).toEqual({ createdAt: -1 });
  });

  it("respects an explicit sortBy/sortOrder", () => {
    const { sort } = buildListQuery({ sortBy: "name", sortOrder: "asc" }, {});
    expect(sort).toEqual({ name: 1 });
  });
});

describe("queryBuilder.buildPagination", () => {
  it("computes pages as ceil(total/limit)", () => {
    expect(buildPagination(45, 1, 20)).toEqual({ total: 45, page: 1, limit: 20, pages: 3 });
  });

  it("floors pages at 1 for an empty result set, avoiding a divide-by-zero on the frontend", () => {
    expect(buildPagination(0, 1, 20)).toEqual({ total: 0, page: 1, limit: 20, pages: 1 });
  });

  it("clamps page to a minimum of 1", () => {
    expect(buildPagination(10, 0, 20).page).toBe(1);
    expect(buildPagination(10, -5, 20).page).toBe(1);
  });

  it("clamps limit to a minimum of 1 and a maximum of 100", () => {
    expect(buildPagination(10, 1, 0).limit).toBe(1);
    expect(buildPagination(10, 1, 999999).limit).toBe(100);
  });
});

describe("queryBuilder.paginationParams", () => {
  it("returns sane defaults with no query params", () => {
    expect(paginationParams({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it("computes skip from page and limit", () => {
    expect(paginationParams({ page: "3", limit: "10" })).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it("prevents a client from requesting an unbounded limit", () => {
    expect(paginationParams({ limit: "999999" }).limit).toBe(100);
  });
});
