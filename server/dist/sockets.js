"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapSockets = bootstrapSockets;
const socket_io_1 = require("socket.io");
const index_1 = require("./index");
const jwt_1 = require("./utils/jwt");
function bootstrapSockets(server) {
    const io = new socket_io_1.Server(server, { cors: { origin: "http://localhost:3000" } });
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication error"));
            }
            const decoded = (0, jwt_1.verifyAndDecodeJWT)(token);
            if (!decoded) {
                return next(new Error("Authentication error"));
            }
            socket.data.userId = decoded.userId;
            socket.data.username = decoded.username;
            next();
        }
        catch (err) {
            next(new Error("Authentication error"));
        }
    });
    io.on("connection", (socket) => {
        console.log(`User ${socket.data.username} connected`);
        socket.on("sendMessage", async (data) => {
            try {
                const { conversationId, content } = data;
                const message = await index_1.prisma.message.create({
                    data: {
                        content,
                        authorId: socket.data.userId,
                        conversationId: parseInt(conversationId),
                    },
                    include: {
                        author: true,
                    },
                });
                io.emit(`conversation:${conversationId}:message`, {
                    id: message.id,
                    content: message.content,
                    authorId: message.authorId,
                    authorUsername: message.author.username,
                    timestamp: message.createdAt,
                });
            }
            catch (error) {
                console.error("Error sending message:", error);
                socket.emit("error", "Failed to send message");
            }
        });
        socket.on("disconnect", () => {
            console.log(`User ${socket.data.username} disconnected`);
        });
    });
    io.listen(2023);
}
