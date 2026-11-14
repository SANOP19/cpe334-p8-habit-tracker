import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";

export let prisma = new PrismaClient();

export function setPrisma(customClient: any) {
  prisma = customClient;
}
