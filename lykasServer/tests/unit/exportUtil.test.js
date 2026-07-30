const { toCsv } = require("../../src/utils/exportUtil");

describe("exportUtil.toCsv", () => {
  it("writes a header row from field labels and one row per record", () => {
    const csv = toCsv(
      [
        { name: "Biscuit", species: "Dog" },
        { name: "Whiskers", species: "Cat" },
      ],
      [
        { key: "name", label: "Name" },
        { key: "species", label: "Species" },
      ]
    );

    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Species");
    expect(lines[1]).toBe("Biscuit,Dog");
    expect(lines[2]).toBe("Whiskers,Cat");
  });

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv(
      [{ notes: 'Loves treats, "especially" bacon\nvery food-motivated' }],
      [{ key: "notes", label: "Notes" }]
    );

    const dataLine = csv.split("\n").slice(1).join("\n");
    expect(dataLine).toBe('"Loves treats, ""especially"" bacon\nvery food-motivated"');
  });

  it("renders null/undefined values as empty cells rather than the literal string", () => {
    const csv = toCsv([{ notes: null }, { notes: undefined }], [{ key: "notes", label: "Notes" }]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("");
  });

  it("resolves dotted paths for nested values", () => {
    const csv = toCsv([{ owner: { displayName: "Ada" } }], [{ key: "owner.displayName", label: "Owner" }]);
    expect(csv.split("\n")[1]).toBe("Ada");
  });
});
