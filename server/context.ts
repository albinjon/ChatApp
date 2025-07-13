import * as trpcAdapter from "@trpc/server/adapters/standalone";
import { verify, decode, JwtPayload } from "jsonwebtoken";

export async function createContext({
  req,
}: trpcAdapter.CreateHTTPContextOptions) {
  async function getUserFromHeader() {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const isValid = verify(token, process.env.JWT_SECRET!);
      if (isValid) {
        const decoded = decode(token) as JwtPayload;
        return { userId: decoded.user_id, username: decoded.username };
      }
    }
    return null;
  }
  const user = await getUserFromHeader();
  return {
    user,
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
