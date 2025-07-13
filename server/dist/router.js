"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapTRPC = bootstrapTRPC;
const server_1 = require("@trpc/server");
const standalone_1 = require("@trpc/server/adapters/standalone");
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const bcrypt_1 = require("bcrypt");
const jsonwebtoken_1 = require("jsonwebtoken");
const context_1 = require("./context");
const index_1 = require("./index");
function bootstrapTRPC() {
    const t = server_1.initTRPC.context().create();
    const router = t.router;
    const publicProcedure = t.procedure;
    const protectedProcedure = t.procedure.use(async function isAuthed(opts) {
        const { ctx } = opts;
        if (!ctx.user) {
            throw new server_1.TRPCError({ code: "UNAUTHORIZED" });
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
                conversations: await index_1.prisma.conversation.findMany({
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
            .input(zod_1.z.object({ conversationId: zod_1.z.string() }))
            .query(async ({ input }) => {
            return {
                conversation: await index_1.prisma.conversation.findFirst({
                    where: { id: parseInt(input.conversationId) },
                    include: { messages: true },
                }),
            };
        }),
        getUsers: protectedProcedure.query(async ({ ctx }) => {
            return {
                users: await index_1.prisma.user.findMany({
                    where: { NOT: { id: ctx.user.userId } },
                    omit: { password_hash: true },
                }),
            };
        }),
        login: publicProcedure
            .input(zod_1.z.object({ username: zod_1.z.string(), password: zod_1.z.string() }))
            .mutation(async ({ input }) => {
            const user = await index_1.prisma.user.findFirst({
                where: { username: input.username },
            });
            const passwordHash = user?.password_hash;
            if (!passwordHash) {
                throw new server_1.TRPCError({ code: "UNAUTHORIZED", cause: "NOT_FOUND" });
            }
            const isValid = await (0, bcrypt_1.compare)(input.password, passwordHash);
            if (!isValid) {
                throw new server_1.TRPCError({
                    code: "UNAUTHORIZED",
                    cause: "INVALID_PASSWORD",
                });
            }
            return {
                userId: user.id,
                token: (0, jsonwebtoken_1.sign)({
                    username: user.username,
                    user_id: user.id,
                    // INFO: 15 minutes of expiry.
                    exp: Math.floor(Date.now() / 1000) + 60 * 15,
                }, process.env.JWT_SECRET),
            };
        }),
        createConversation: protectedProcedure
            .input(zod_1.z.object({ participantId: zod_1.z.number() }))
            .mutation(async ({ input, ctx }) => {
            // Check if conversation already exists between these users
            const existingConversation = await index_1.prisma.conversation.findFirst({
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
            const conversation = await index_1.prisma.conversation.create({
                data: {
                    participants: {
                        connect: [{ id: ctx.user.userId }, { id: input.participantId }],
                    },
                },
            });
            return { conversationId: conversation.id };
        }),
    });
    const server = (0, standalone_1.createHTTPServer)({
        middleware: (0, cors_1.default)(),
        router: appRouter,
        createContext: context_1.createContext,
    });
    server.listen(2022);
    return { appRouter, server };
}
