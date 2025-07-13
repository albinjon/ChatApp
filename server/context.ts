import * as trpcAdapter from "@trpc/server/adapters/standalone";
import { verifyAndDecodeJWT } from "./utils/jwt";

export async function createContext({
  req,
}: trpcAdapter.CreateHTTPContextOptions) {
  async function getUserFromHeader() {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      return verifyAndDecodeJWT(token);
    }
    return null;
  }
  const user = await getUserFromHeader();
  return {
    user,
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
