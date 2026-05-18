let counter = 0;
export const randomUUID = () => `mock-uuid-${++counter}`;
export default { randomUUID };
