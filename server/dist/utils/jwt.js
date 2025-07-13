"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAndDecodeJWT = verifyAndDecodeJWT;
const jsonwebtoken_1 = require("jsonwebtoken");
function verifyAndDecodeJWT(token) {
    try {
        const isValid = (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET);
        if (isValid) {
            const decoded = (0, jsonwebtoken_1.decode)(token);
            return {
                userId: decoded.user_id,
                username: decoded.username
            };
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
