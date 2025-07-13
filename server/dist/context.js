"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
const jsonwebtoken_1 = require("jsonwebtoken");
async function createContext({ req, }) {
    async function getUserFromHeader() {
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
            const isValid = (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET);
            if (isValid) {
                const decoded = (0, jsonwebtoken_1.decode)(token);
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
