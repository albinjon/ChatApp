import { PrismaClient } from "@prisma/client";
import { bootstrapTRPC } from "./router";
import { bootstrapSockets } from "./sockets";

export const prisma = new PrismaClient();
const { appRouter, server } = bootstrapTRPC();
bootstrapSockets(server);

export type AppRouter = typeof appRouter;
