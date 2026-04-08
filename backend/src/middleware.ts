import { status, type Context } from "elysia";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { errors, response } from "./types";

interface payloadCtx extends Context {
    userId: string,
    role: string
}

export const auth = (ctx: payloadCtx) => {
    try {
        const bearer = ctx.headers.authorization!;
        const token = bearer.split(' ')[1] as string;
        const { userId, role } = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        ctx.userId = userId; ctx.role = role;
    } catch(e) {
        status(401, response(false, null, errors.unauthorized401));
    }
}