import { prisma, setPrisma } from "../src/lib/prisma.js";
import { PrismaClient } from "@prisma/client";

// In-memory test store fallback when PostgreSQL server is unreachable
class InMemoryPrisma {
  private users: any[] = [];
  private templates: any[] = [];
  private goals: any[] = [];
  private entries: any[] = [];
  private sessions: any[] = [];
  private idSeq = 1;

  public user = {
    create: async ({ data }: any) => {
      if (this.users.find((u) => u.email === data.email)) {
        throw new Error("Unique constraint failed on the fields: (`email`)");
      }
      const record = { id: this.idSeq++, createdAt: new Date(), ...data };
      this.users.push(record);
      return record;
    },
    upsert: async ({ where, update, create }: any) => {
      const idx = this.users.findIndex((u) => u.email === where.email);
      if (idx >= 0) {
        this.users[idx] = { ...this.users[idx], ...update };
        return this.users[idx];
      }
      const record = { id: this.idSeq++, createdAt: new Date(), ...create };
      this.users.push(record);
      return record;
    },
    findUnique: async ({ where }: any) => {
      return this.users.find((u) => u.email === where.email || u.id === where.id) || null;
    },
    deleteMany: async () => {
      this.users = [];
      return { count: 0 };
    },
  };

  public activityTemplate = {
    create: async ({ data }: any) => {
      const record = { id: this.idSeq++, createdAt: new Date(), ...data };
      this.templates.push(record);
      return record;
    },
    findFirst: async ({ where }: any) => {
      if (where.name) return this.templates.find((t) => t.name === where.name) || null;
      return this.templates[0] || null;
    },
    findMany: async () => this.templates,
    deleteMany: async () => {
      this.templates = [];
      return { count: 0 };
    },
  };

  public goal = {
    create: async ({ data }: any) => {
      const record = { id: this.idSeq++, createdAt: new Date(), ...data };
      this.goals.push(record);
      return record;
    },
    findMany: async () => this.goals,
    deleteMany: async () => {
      this.goals = [];
      return { count: 0 };
    },
  };

  public activityEntry = {
    create: async ({ data }: any) => {
      // Enforce BR-04 unique(goalId, entryDate)
      const duplicate = this.entries.find(
        (e) => e.goalId === data.goalId && e.entryDate === data.entryDate
      );
      if (duplicate) {
        throw new Error("Unique constraint failed on the fields: (`goalId`, `entryDate`)");
      }
      const record = { id: this.idSeq++, createdAt: new Date(), ...data };
      this.entries.push(record);
      return record;
    },
    findMany: async () => this.entries,
    deleteMany: async () => {
      this.entries = [];
      return { count: 0 };
    },
  };

  public session = {
    create: async ({ data }: any) => {
      const record = { id: `sess_${this.idSeq++}`, createdAt: new Date(), ...data };
      this.sessions.push(record);
      return record;
    },
    deleteMany: async () => {
      this.sessions = [];
      return { count: 0 };
    },
  };

  public $disconnect = async () => {};
}

let isRealDbConnected: boolean | null = null;
const inMemoryStore = new InMemoryPrisma();

export async function getTestPrisma() {
  if (isRealDbConnected === null) {
    try {
      const realClient = new PrismaClient();
      await Promise.race([
        realClient.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000)),
      ]);
      isRealDbConnected = true;
      setPrisma(realClient);
    } catch {
      isRealDbConnected = false;
      setPrisma(inMemoryStore);
    }
  }
  return isRealDbConnected ? prisma : inMemoryStore;
}

export async function resetDatabase() {
  await getTestPrisma();
  await prisma.activityEntry.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.activityTemplate.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}
