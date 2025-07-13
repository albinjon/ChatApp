"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
const jwt_1 = require("./utils/jwt");
async function createContext({ req, }) {
    async function getUserFromHeader() {
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
            return (0, jwt_1.verifyAndDecodeJWT)(token);
        }
        return null;
    }
    const user = await getUserFromHeader();
    return {
        user,
    };
}
