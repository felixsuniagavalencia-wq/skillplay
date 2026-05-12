// DB Connection - SkillPlay
export const db = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      get: async () => ({ exists: false, data: () => null, ref: { update: async () => {} } }),
      update: async () => {},
    }),
    where: (field: string, op: string, value: any) => ({
      limit: (n: number) => ({
        get: async () => ({ empty: true, docs: [] }),
      }),
    }),
    add: async (data: any) => ({ id: 'mock-id' }),
  }),
};

export default db;