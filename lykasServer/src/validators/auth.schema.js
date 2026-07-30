const { z } = require("zod");

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const password = z.string().min(8, "Password must be at least 8 characters");

const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email,
    password,
  })
  .strict();

const loginSchema = z
  .object({
    email,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

const googleAuthSchema = z
  .object({
    idToken: z.string().min(10, "idToken is required"),
  })
  .strict();

const verifyEmailSchema = z
  .object({
    token: z.string().min(10),
  })
  .strict();

const forgotPasswordSchema = z
  .object({
    email,
  })
  .strict();

const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    newPassword: password,
  })
  .strict();

const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(10),
  })
  .strict();

const logoutSchema = z
  .object({
    refreshToken: z.string().min(10).optional(),
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  logoutSchema,
};
