import { initTRPC, TRPCError } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import cors from "cors";
import { z } from "zod";
import { compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import { Context, createContext } from "./context";
import { prisma } from "./index";

export function bootstrapTRPC() {
  const t = initTRPC.context<Context>().create();
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
    getConversation: protectedProcedure
      .input(z.object({ conversationId: z.string() }))
      .query(async ({ input }) => {
        return {
          conversation: await prisma.conversation.findFirst({
            where: { id: parseInt(input.conversationId) },
            include: { messages: true },
          }),
        };
      }),
    getUsers: protectedProcedure.query(async ({ ctx }) => {
      return {
        users: await prisma.user.findMany({
          where: { NOT: { id: ctx.user.userId } },
          omit: { password_hash: true },
        }),
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
              // INFO: 15 minutes of expiry.
              exp: Math.floor(Date.now() / 1000) + 60 * 1,
            },
            process.env.JWT_SECRET!,
          ),
        };
      }),
    createConversation: protectedProcedure
      .input(z.object({ participantId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const existingConversation = await prisma.conversation.findFirst({
          where: {
            participants: {
              every: {
                id: { in: [ctx.user.userId, input.participantId] },
              },
            },
          },
          include: {
            participants: true,
          },
        });

        if (existingConversation) {
          return { conversationId: existingConversation.id };
        }

        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              connect: [{ id: ctx.user.userId }, { id: input.participantId }],
            },
          },
        });

        return { conversationId: conversation.id };
      }),
  });

  const server = createHTTPServer({
    middleware: cors(),
    router: appRouter,
    createContext,
  });

  server.listen(2022);
  return { appRouter, server };
}
