import { initTRPC, TRPCError } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import cors from "cors";
import { z } from "zod";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import { Context, createContext } from "./context";
import { protectedProcedure, publicProcedure } from "./procedures";

export const t = initTRPC.context<Context>().create();
const prisma = new PrismaClient();
const router = t.router;

const appRouter = router({
  getConversations: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return {
        conversations: await prisma.conversation.findMany({
          where: { participants: { some: { id: input.id } } },
          orderBy: { updatedAt: "desc" },
        }),
      };
    }),
  getUsers: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return {
        users: await prisma.user.findMany({ where: { NOT: { id: input.id } } }),
      };
    }),
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findFirst({
        where: { username: input.username },
      });

      const passwordHash = user?.password_hash;
      if (!passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", cause: "NOT_FOUND" });
      }

      const isValid = compare(input.password, passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          cause: "INVALID_PASSWORD",
        });
      }

      return {
        userId: user.id,
        token: sign(
          {
            username: user.username,
            user_id: user.id,
            // INFO: 5 minutes of expiry.
            exp: Math.floor(Date.now() / 1000) + 60 * 5,
          },
          process.env.JWT_SECRET!,
        ),
      };
    }),
});

export type AppRouter = typeof appRouter;

const server = createHTTPServer({
  middleware: cors(),
  router: appRouter,
  createContext,
});
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

server.listen(2022);
io.listen(2023);
