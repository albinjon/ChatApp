import { verify, decode, JwtPayload } from "jsonwebtoken";

export interface DecodedJWT {
  userId: number;
  username: string;
}

export function verifyAndDecodeJWT(token: string): DecodedJWT | null {
  try {
    const isValid = verify(token, process.env.JWT_SECRET!);
    if (isValid) {
      const decoded = decode(token) as JwtPayload;
      return { 
        userId: decoded.user_id, 
        username: decoded.username 
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}