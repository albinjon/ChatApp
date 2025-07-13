import { Server } from "socket.io";
import { prisma } from "./index";
import { verifyAndDecodeJWT } from "./utils/jwt";
import { createHTTPServer } from "@trpc/server/adapters/standalone";

export function bootstrapSockets(server: ReturnType<typeof createHTTPServer>) {
  const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = verifyAndDecodeJWT(token);
      if (!decoded) {
        return next(new Error("Authentication error"));
      }

      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User ${socket.data.username} connected`);
    socket.on("sendMessage", async (data: any) => {
      try {
        const { conversationId, content } = data;

        const message = await prisma.message.create({
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
          conversationId: message.conversationId,
          authorId: message.authorId,
          createdAt: message.createdAt,
        });
      } catch (error) {
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
