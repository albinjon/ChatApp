import { initTRPC, TRPCError } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import cors from "cors";
import { z } from "zod";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import { Context, createContext } from "./context";

export const t = initTRPC.context<Context>().create();
const prisma = new PrismaClient();
const router = t.router;

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(async function isAuthed(opts) {
  const { ctx } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return opts.next({
    ctx: {
      user: ctx.user,
    },
  });
});

const appRouter = router({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    return {
      conversations: await prisma.conversation.findMany({
        where: { participants: { some: { id: ctx.user.userId } } },
        include: {
          participants: true,
          messages: { take: 1, orderBy: { createdAt: "desc" } },
        },
        orderBy: { updatedAt: "desc" },
      }),
    };
  }),
  getUsers: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        users: await prisma.user.findMany({ where: { NOT: { id: ctx.user.userId } } }),
      };
    }),
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findFirst({
        where: { username: input.username },
      });

      const passwordHash = user?.password_hash;
      if (!passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", cause: "NOT_FOUND" });
      }

      const isValid = await compare(input.password, passwordHash);
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
