// DB Connection - SkillPlay
export const db = {
  collection: () => ({
    doc: () => ({ get: async () => ({ exists: false }) }),
    where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
    add: async () => ({ id: 'mock' }),
  }),
};
export default db;