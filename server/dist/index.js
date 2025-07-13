"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const router_1 = require("./router");
const sockets_1 = require("./sockets");
exports.prisma = new client_1.PrismaClient();
const { appRouter, server } = (0, router_1.bootstrapTRPC)();
(0, sockets_1.bootstrapSockets)(server);
