import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LogActivityParams } from "@/lib/activity-log";

// Mock the Supabase client
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  select: mockSelect,
}));

const mockSupabaseClient = {
  from: mockFrom,
};

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: () => mockSupabaseClient,
}));

describe("logActivity metadata structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "test-id" },
          error: null,
        }),
      }),
    });
  });

  it("builds enriched metadata for analyze_completed", async () => {
    // Import after mocks are set up
    const { logActivity } = await import("@/lib/activity-log");

    const params: LogActivityParams = {
      orgId: "test-org-id",
      userId: "test-user-id",
      type: "analyze_completed",
      unifiedItemId: "test-item-id",
      context: {
        source: "workbench",
        model: "gpt-4o-mini",
        duration_ms: 1234,
        summary_length: 150,
        entities_count: 5,
        next_step_detected: true,
        title: "Test Document",
        snippet: "Test snippet",
        metadata: { source: "test", kind: "document" },
      },
    };

    await logActivity(params);

    expect(mockFrom).toHaveBeenCalledWith("activity_log");
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall).toMatchObject({
      org_id: "test-org-id",
      user_id: "test-user-id",
      type: "analyze_completed",
      unified_item_id: "test-item-id",
    });

    expect(insertCall.context).toMatchObject({
      source: "workbench",
      model: "gpt-4o-mini",
      duration_ms: 1234,
      summary_length: 150,
      entities_count: 5,
      next_step_detected: true,
    });
  });

  it("includes all required metadata fields", async () => {
    const { logActivity } = await import("@/lib/activity-log");

    const params: LogActivityParams = {
      orgId: "test-org-id",
      type: "analyze_completed",
      context: {
        source: "workbench",
        model: "gpt-4o-mini",
        duration_ms: 500,
        summary_length: 100,
        entities_count: 3,
        next_step_detected: false,
      },
    };

    await logActivity(params);

    const insertCall = mockInsert.mock.calls[0][0];
    const context = insertCall.context as Record<string, unknown>;

    // Verify all enriched fields are present
    expect(context).toHaveProperty("source");
    expect(context).toHaveProperty("model");
    expect(context).toHaveProperty("duration_ms");
    expect(context).toHaveProperty("summary_length");
    expect(context).toHaveProperty("entities_count");
    expect(context).toHaveProperty("next_step_detected");

    expect(context.source).toBe("workbench");
    expect(context.model).toBe("gpt-4o-mini");
    expect(context.duration_ms).toBe(500);
    expect(context.summary_length).toBe(100);
    expect(context.entities_count).toBe(3);
    expect(context.next_step_detected).toBe(false);
  });
});

