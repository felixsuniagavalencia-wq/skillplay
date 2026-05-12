// DB Connection - SkillPlay
export const db: any = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      get: async () => ({ exists: false, data: () => ({}), ref: { update: async () => {} } }),
      update: async () => {},
    }),
    where: (...args: any[]) => ({
      limit: (n: number) => ({
        get: async () => ({ empty: true, docs: [] as any[] }),
      }),
    }),
    add: async (data: any) => ({ id: 'mock-id' }),
  }),
};

export default db;