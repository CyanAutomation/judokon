import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestMockupViewer } from "../utils/componentTestUtils.js";

describe("MockupViewerPage Integration (Enhanced API)", () => {
  let mockupViewer;

  beforeEach(async () => {
    // Use component factory instead of innerHTML manipulation
    mockupViewer = createTestMockupViewer();
    await mockupViewer.testApi.initialize();
  });

  afterEach(() => {
    // Clean up properly
    if (mockupViewer) {
      mockupViewer.testApi.cleanup();
    }
  });

  it("should initialize mockup viewer with image list", async () => {
    const imageList = mockupViewer.testApi.getImageList();
    expect(imageList).toBeTruthy();
    expect(mockupViewer.testApi.getImageCount()).toBeGreaterThan(0);
  });

  it("should navigate between mockups using buttons", async () => {
    const initialIndex = mockupViewer.testApi.getSelectedIndex();

    // Test next navigation
    mockupViewer.testApi.navigateNext();
    const nextIndex = mockupViewer.testApi.getSelectedIndex();
    expect(nextIndex).not.toBe(initialIndex);

    // Test previous navigation
    mockupViewer.testApi.navigatePrev();
    const prevIndex = mockupViewer.testApi.getSelectedIndex();
    expect(prevIndex).toBe(initialIndex);
  });
});
