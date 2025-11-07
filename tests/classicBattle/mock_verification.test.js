import { vi, test, expect } from "vitest";

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));

import { showSnackbar } from "../../src/helpers/showSnackbar.js";

test("basic mock works", () => {
  showSnackbar("test");
  expect(showSnackbar).toHaveBeenCalledWith("test");
});
