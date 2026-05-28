import { jest } from "@jest/globals";

const mockSchedule = jest.fn();

jest.unstable_mockModule("node-cron", () => ({
  default: { schedule: mockSchedule },
  schedule: mockSchedule,
}));

const mockRunJob = jest.fn();

jest.unstable_mockModule("../services/notificaciones.service.js", () => ({
  runJob: mockRunJob,
}));

const { initNotificacionesScheduler } = await import("../utils/notificacionesScheduler.js");

beforeEach(() => jest.clearAllMocks());

describe("initNotificacionesScheduler", () => {
  it("registra un cron job con expresión '0 2 * * *'", () => {
    initNotificacionesScheduler();
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule.mock.calls[0][0]).toBe("0 2 * * *");
  });

  it("el callback invoca runJob exitosamente", async () => {
    mockRunJob.mockResolvedValueOnce({ stockBajo: 1, proximas: 0, vencidas: 0 });
    initNotificacionesScheduler();
    const callback = mockSchedule.mock.calls[0][1];
    await callback();
    expect(mockRunJob).toHaveBeenCalledTimes(1);
  });

  it("el callback captura errores de runJob sin lanzar", async () => {
    mockRunJob.mockRejectedValueOnce(new Error("DB timeout"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    initNotificacionesScheduler();
    const callback = mockSchedule.mock.calls[0][1];
    await expect(callback()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[notificaciones-scheduler]"),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});
