import { status, type Context } from "elysia";
import { errors, response, type signupSchema, type loginSchema } from "../types";
import { prisma } from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const signupUser = async ({ body }: Context<{ body: signupSchema }>) => {
    const userExist = await prisma.user.findFirst({
        where: { email: body.email }
    });
    if (userExist) return status(409, response(false, null, errors.emailConflict409));
    const hashedPassword = await bcrypt.hash(body.password, process.env.SALT!);
    const createdUser = await prisma.user.create({
        data: {
            name: body.name,
            email: body.email,
            password: hashedPassword,
            phone: body.phone,
            role: body.role,
        }, omit: { password: true }
    });
    return status(201, response(true, createdUser, null));
}

const loginUser = async ({ body }: Context<{ body: loginSchema }>) => {
    const authorizedUser = await prisma.user.findFirst({
        where: { email: body.email }
    });
    if (!authorizedUser) return status(404, response(false, null, errors.userNotFound404));
    if (!await bcrypt.compare(body.password, authorizedUser.password)) {
        return status(402, response(false, null, errors.invalidCredentials402));
    }
    const token = jwt.sign({ 
        userId: authorizedUser.id, 
        role: authorizedUser.role 
    }, process.env.JWT_SECRET!);
    return status(200, response(true, { token }, null));
}

export const authController = {
    signupUser,
    loginUser
}