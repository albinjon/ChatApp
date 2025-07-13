"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.t = void 0;
const server_1 = require("@trpc/server");
const standalone_1 = require("@trpc/server/adapters/standalone");
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const bcrypt_1 = require("bcrypt");
const jsonwebtoken_1 = require("jsonwebtoken");
const context_1 = require("./context");
exports.t = server_1.initTRPC.context().create();
const prisma = new client_1.PrismaClient();
const router = exports.t.router;
const publicProcedure = exports.t.procedure;
const protectedProcedure = exports.t.procedure.use(async function isAuthed(opts) {
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
    getConversations: protectedProcedure
        .input(zod_1.z.object({ id: zod_1.z.number() }))
        .query(async ({ input }) => {
        return {
            conversations: await prisma.conversation.findMany({
                where: { participants: { some: { id: input.id } } },
                orderBy: { updatedAt: "desc" },
            }),
        };
    }),
    getUsers: protectedProcedure
        .input(zod_1.z.object({ id: zod_1.z.number() }))
        .query(async ({ input }) => {
        return {
            users: await prisma.user.findMany({ where: { NOT: { id: input.id } } }),
        };
    }),
    login: exports.t.procedure
        .input(zod_1.z.object({ username: zod_1.z.string(), password: zod_1.z.string() }))
        .mutation(async ({ input }) => {
        const user = await prisma.user.findFirst({
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
                // INFO: 5 minutes of expiry.
                exp: Math.floor(Date.now() / 1000) + 60 * 5,
            }, process.env.JWT_SECRET),
        };
    }),
});
const server = (0, standalone_1.createHTTPServer)({
    middleware: (0, cors_1.default)(),
    router: appRouter,
    createContext: context_1.createContext,
});
const io = new socket_io_1.Server(server, { cors: { origin: "http://localhost:3000" } });
server.listen(2022);
io.listen(2023);
