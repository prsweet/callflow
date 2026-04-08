import { z } from "zod";
type responseType = {
    success: boolean,
    data: object | null,
    error: string | null
};

export const signupSchema = z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string(),
    password: z.string(),
    role: z.enum(["Employee", "Admin"])
});

export const loginSchema = z.object({
    email: z.string(),
    password: z.string(),
    role: z.enum(["Employee", "Admin"])
});

export function response(success: true, data: object, error: null): responseType;
export function response(success: false, data: null, error: string): responseType;
export function response(success: boolean, data: object | null, error: string | null): responseType {
    return { success, data, error } as responseType;
}

export const errors = {
    zod400: "INVALID_REQUEST",
    emailConflict409: "EMAIL_ALREADY_EXIST",
    userNotFound404: "USER_NOT_FOUND",
    invalidCredentials402: "INVALID_CREDENTIALS",
    unauthorized401: "UNAUTHORIZED"
}