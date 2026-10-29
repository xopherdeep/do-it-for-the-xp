import { AssetDlcService, DLC_PRIMARY_ENDPOINT, DLC_CACHE_NAME } from "@/lib/services/dlc/assetDlcService";

describe("AssetDlcService", () => {
  let service: AssetDlcService;

  beforeEach(() => {
    service = AssetDlcService.getInstance();
  });

  it("provides singleton instance with default idle state", () => {
    expect(service).toBeDefined();
    expect(service.progress.status).toBe("idle");
    expect(service.progress.percent).toBe(0);
  });

  it("contains valid primary CDN endpoint and cache name", () => {
    expect(DLC_PRIMARY_ENDPOINT).toContain("r2.dev/dlc");
    expect(DLC_CACHE_NAME).toBe("xp-dlc-v1");
  });

  it("handles status check gracefully in test environment", async () => {
    const isReady = await service.checkStatus();
    expect(typeof isReady).toBe("boolean");
    expect(["ready", "available"]).toContain(service.progress.status);
  });
});
