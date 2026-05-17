export const dbInsert = jest.fn();
export const dbUpdate = jest.fn();
export const dbDelete = jest.fn();
export const dbGetAll = jest.fn().mockResolvedValue([]);
export const dbGetOne = jest.fn().mockResolvedValue(null);
export const dbQuery = jest.fn().mockResolvedValue([]);
export const initializeDatabase = jest.fn();
