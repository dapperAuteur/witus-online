"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, gt } from "drizzle-orm";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db";
import { invitations, users } from "@/db/schema";

const DEFAULT_EXPIRY_DAYS = 30;
const MAX_EXPIRY_DAYS = 365;

const InviteFormSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  expiresInDays: z
    .union([
      z.coerce.number().int().positive().max(MAX_EXPIRY_DAYS),
      z.literal("").transform(() => DEFAULT_EXPIRY_DAYS),
    ])
    .default(DEFAULT_EXPIRY_DAYS),
});

export type FormState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; message: string };

async function requireAdminUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  const adminEmail = getEnv().ADMIN_EMAIL.toLowerCase();
  if (!email || email !== adminEmail) throw new Error("not authorized");
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (!existing)
    throw new Error("admin user row not minted — sign in via magic link first");
  return existing.id;
}

export async function createInvitationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const adminUserId = await requireAdminUserId();
  const adminEmail = getEnv().ADMIN_EMAIL.toLowerCase();

  const parsed = InviteFormSchema.safeParse({
    email: (formData.get("email") ?? "").toString(),
    expiresInDays: formData.get("expiresInDays") ?? "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const { email, expiresInDays } = parsed.data;

  if (email === adminEmail) {
    return {
      status: "error",
      error: "The admin email is always allowed — no invitation needed.",
    };
  }

  const db = getDb();
  const existing = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.email, email),
      isNull(invitations.revokedAt),
      gt(invitations.expiresAt, new Date())
    ),
    columns: { id: true },
  });
  if (existing) {
    return {
      status: "error",
      error: `${email} already has an active invitation.`,
    };
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60_000);
  await db.insert(invitations).values({
    email,
    invitedBy: adminUserId,
    expiresAt,
  });

  revalidatePath("/admin/invitations");
  return {
    status: "success",
    message: `Invited ${email}. They can sign in via magic link at /auth/sign-in until ${expiresAt.toISOString().slice(0, 10)}.`,
  };
}

export async function revokeInvitationAction(id: string): Promise<void> {
  await requireAdminUserId();
  const db = getDb();
  await db
    .update(invitations)
    .set({ revokedAt: new Date() })
    .where(eq(invitations.id, id));
  revalidatePath("/admin/invitations");
}
