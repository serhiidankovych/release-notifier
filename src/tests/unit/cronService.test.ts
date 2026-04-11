/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals";

const mockScanner = { scan: jest.fn() };
const mockCronTask = { stop: jest.fn() };
const mockCron = {
  schedule: jest.fn((sched: string, cb: () => Promise<void>) => {
    console.log(sched);
    console.log(cb);
    return mockCronTask;
  }),
};

jest.unstable_mockModule("node-cron", () => ({ default: mockCron }));
jest.unstable_mockModule("../../services/releaseScanner.js", () => ({
  ReleaseScanner: jest.fn(() => mockScanner),
}));
jest.unstable_mockModule("../../config/unifiedConfig.js", () => ({
  config: { github: { cronSchedule: "0 * * * *" } },
}));
jest.unstable_mockModule("@sentry/node", () => ({
  startSpan: jest.fn((ctx, cb: any) => cb()),
  captureException: jest.fn(),
}));

const { CronService } = await import("../../services/cronService.js");

describe("CronService", () => {
  let cronService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cronService = new CronService();
  });

  it("should schedule the scanner on start", () => {
    cronService.start();
    expect(mockCron.schedule).toHaveBeenCalledWith(
      "0 * * * *",
      expect.any(Function),
    );
  });

  it("should run the scanner when the cron job triggers", async () => {
    cronService.start();

    const cronCallback = mockCron.schedule.mock.calls[0][1];
    await cronCallback();

    expect(mockScanner.scan).toHaveBeenCalled();
  });

  it("should stop the task on stop", () => {
    cronService.start();
    cronService.stop();
    expect(mockCronTask.stop).toHaveBeenCalled();
  });
});
