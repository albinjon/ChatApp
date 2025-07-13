import { initTRPC } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import cors from "cors";
import { z } from "zod";
import { Server } from "socket.io";

const t = initTRPC.create();

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  greeting: publicProcedure
    // This is the input schema of your procedure
    // 💡 Tip: Try changing this and see type errors on the client straight away
    .input(
      z
        .object({
          name: z.string().nullish(),
        })
        .nullish(),
    )
    .query(({ input }) => {
      // This is what you're returning to your client
      return {
        text: `hello ${input?.name ?? "world"}`,
        // 💡 Tip: Try adding a new property here and see it propagate to the client straight-away
      };
    }),
});

export type AppRouter = typeof appRouter;

const server = createHTTPServer({
  middleware: cors(),
  router: appRouter,
  createContext() {
    console.log("context 3");
    return {};
  },
});
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

server.listen(2022);
io.listen(2023);
