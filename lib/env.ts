import "server-only";
import { z } from "zod";

// Accept either naming convention the Vercel-Neon integration may use:
//   STORAGE_DATABASE_URL — older marketplace integration
//   DATABASE_URL         — newer Neon integration
// The Zod schema normalizes to a single `STORAGE_DATABASE_URL` field on the
// resolved env object so consumers don't need to know which convention is in
// play. The schema preprocess step copies DATABASE_URL → STORAGE_DATABASE_URL
// when only the new var is present.
const RawEnvShape = z.object({
  STORAGE_DATABASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16),
  EMAIL_SERVER: z.string().min(1),
  EMAIL_FROM: z
    .string()
    .min(3)
    .refine(
      (v) =>
        /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v) ||
        /<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>\s*$/.test(v),
      'Must be "addr@host" or "Name <addr@host>"'
    ),
  ADMIN_EMAIL: z.string().email(),
});

const EnvSchema = RawEnvShape.transform((raw, ctx) => {
  const dbUrl = raw.STORAGE_DATABASE_URL ?? raw.DATABASE_URL;
  if (!dbUrl) {
    ctx.addIssue({
      code: "custom",
      path: ["STORAGE_DATABASE_URL"],
      message:
        "STORAGE_DATABASE_URL or DATABASE_URL is required (provision Neon via Vercel marketplace)",
    });
    return z.NEVER;
  }
  return {
    STORAGE_DATABASE_URL: dbUrl,
    NEXTAUTH_URL: raw.NEXTAUTH_URL,
    NEXTAUTH_SECRET: raw.NEXTAUTH_SECRET,
    EMAIL_SERVER: raw.EMAIL_SERVER,
    EMAIL_FROM: raw.EMAIL_FROM,
    ADMIN_EMAIL: raw.ADMIN_EMAIL,
  };
});

type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
