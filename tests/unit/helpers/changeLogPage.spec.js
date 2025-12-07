import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchJson = vi.fn();
const initTooltips = vi.fn();
const spinner = {
  show: vi.fn(),
  remove: vi.fn()
};

vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson
}));

vi.mock("../../../src/helpers/tooltip.js", () => ({
  initTooltips
}));

vi.mock("../../../src/components/Spinner.js", () => ({
  createSpinner: vi.fn(() => spinner)
}));

vi.mock("../../../src/helpers/domReady.js", () => ({
  onDomReady: () => {}
}));

describe("changeLogPage", () => {
  const fixtureEntries = [
    {
      id: 2,
      firstname: "Alpha",
      surname: "Beta",
      cardCode: "AB-02",
      lastUpdated: "2024-02-10"
    },
    {
      id: 1,
      firstname: "Charlie",
      surname: "Delta",
      cardCode: "CD-01",
      lastUpdated: "2024-02-15"
    },
    {
      id: 3,
      firstname: "Alpha",
      surname: "Anders",
      cardCode: "AA-03",
      lastUpdated: "2024-02-10"
    }
  ];

  beforeEach(() => {
    vi.resetModules();
    fetchJson.mockReset();
    initTooltips.mockReset();
    spinner.show.mockReset();
    spinner.remove.mockReset();
    document.body.innerHTML = `
      <div id="loading-container"></div>
      <table id="changelog-table" aria-label="Judoka update log">
        <tbody></tbody>
      </table>
    `;
  });

  it("sorts judoka newest-first with name tie-breakers", async () => {
    const { sortJudoka } = await import("../../../src/helpers/changeLogPage.js");

    const sorted = sortJudoka([...fixtureEntries]);

    expect(sorted.map((entry) => entry.id)).toEqual([1, 3, 2]);
    expect(fixtureEntries.map((entry) => entry.id)).toEqual([2, 1, 3]);
  });

  it("renders sorted changelog rows with formatted dates", async () => {
    fetchJson.mockResolvedValue([...fixtureEntries]);
    const { setupChangeLogPage } = await import("../../../src/helpers/changeLogPage.js");

    await setupChangeLogPage();

    const rows = document.querySelectorAll("#changelog-table tbody tr");
    expect(rows).toHaveLength(3);

    const firstRowCells = rows[0].querySelectorAll("td");
    const idCell = firstRowCells[0];
    const nameCell = Array.from(firstRowCells).find((cell) =>
      cell.textContent.includes("Charlie Delta")
    );
    const dateCell = Array.from(firstRowCells).find((cell) =>
      cell.textContent.includes("2024-02-15")
    );

    expect(idCell.textContent).toBe("1");
    expect(nameCell).toBeTruthy();
    expect(dateCell).toBeTruthy();

    expect(spinner.show).toHaveBeenCalled();
    expect(spinner.remove).toHaveBeenCalled();
    expect(initTooltips).toHaveBeenCalled();
  });
});
