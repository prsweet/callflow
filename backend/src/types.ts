import { t, type Static } from "elysia";

export const signupSchema = t.Object({
    name: t.String(),
    phone: t.String(),
    email: t.String(),
    password: t.String(),
    role: t.UnionEnum(["Employee", "Admin"])
});

export const loginSchema = t.Object({
    email: t.String(),
    password: t.String(),
    role: t.UnionEnum(["Employee", "Admin"])
});

export const customerPhone = t.Object({
    customerPhone: t.String()
});

export const aiResponseSchema = t.Object({
    action: t.UnionEnum(["ASK", "ROUTE", "CLOSE"]),
    speech: t.String()
})


export type routeDialType = {
    [key: string]: any,
    continue: boolean
}
export type signupSchema = Static<typeof signupSchema>;
export type loginSchema = Static<typeof loginSchema>;
export type customerPhone = Static<typeof customerPhone>;
type responseType = {
    success: true,
    data: object,
    error: null
} | {
    success: false,
    data: null,
    error: string
};

export function response(success: boolean, data: object | null, error: string | null) {
    return { success, data, error } as responseType;
}

export const errors = {
    typeBox400: "INVALID_REQUEST",
    emailConflict409: "EMAIL_ALREADY_EXIST",
    userNotFound404: "USER_NOT_FOUND",
    invalidCredentials402: "INVALID_CREDENTIALS",
    unauthorized401: "UNAUTHORIZED",
    failedInitialisingCall500: "FAILED_INITIATING_CALL"
}