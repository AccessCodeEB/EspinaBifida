import { jest } from "@jest/globals";

export const TEST_SECRET = "test-secret-espina-bifida";

export const mockExecute  = jest.fn();
export const mockClose    = jest.fn().mockResolvedValue(undefined);
export const mockCommit   = jest.fn().mockResolvedValue(undefined);
export const mockRollback = jest.fn().mockResolvedValue(undefined);

export const mockConn = {
  execute:  mockExecute,
  close:    mockClose,
  commit:   mockCommit,
  rollback: mockRollback,
};

export function resetMocks() {
  jest.clearAllMocks();
  mockExecute.mockReset();
  mockClose.mockResolvedValue(undefined);
  mockCommit.mockResolvedValue(undefined);
  mockRollback.mockResolvedValue(undefined);
}

export const dbModuleMock = {
  getConnection: jest.fn().mockResolvedValue(mockConn),
  createPool:    jest.fn().mockResolvedValue(undefined),
  closePool:     jest.fn().mockResolvedValue(undefined),
};
