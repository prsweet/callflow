import { status, type Context } from "elysia";
import { errors, loginSchema, response, signupSchema } from "../types";
import { prisma } from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


const signupUser = async ({ body }: Context) => {
    const { success, data } = signupSchema.safeParse(body);
    if (!success) return status(400, response(false, null, errors.zod400));
    const userExist = await prisma.user.findFirst({
        where: { email: data.email }
    });
    if (userExist) return status(409, response(false, null, errors.emailConflict409));
    const hashedPassword = await bcrypt.hash(data.password, process.env.SALT!);
    const createdUser = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
            phone: data.phone,
            role: data.role,
        }, omit: { password: true }
    });
    return status(201, response(true, createdUser, null));
}

const loginUser = async ({ body }: Context) => {
    const { success, data } = loginSchema.safeParse(body);
    if (!success) return status(400, response(false, null, errors.zod400));
    const authorizedUser = await prisma.user.findFirst({
        where: { email: data.email }
    });
    if (!authorizedUser) return status(404, response(false, null, errors.userNotFound404));
    if (!await bcrypt.compare(data.password, authorizedUser.password)) return status(402, response(false, null, errors.invalidCredentials402));
    const token = jwt.sign({ userId: authorizedUser.id, role: authorizedUser.role }, process.env.JWT_SECRET!);
    return status(200, response(true, { token }, null));
}

export const authController = {
    signupUser,
    loginUser
}