"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectedProcedure = exports.publicProcedure = void 0;
const index_1 = require("./index");
const server_1 = require("@trpc/server");
exports.publicProcedure = index_1.t.procedure;
exports.protectedProcedure = index_1.t.procedure.use(async function isAuthed(opts) {
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
