"use server";

import { redirect } from "next/navigation";
import {
  BVC_SUBMISSIONS_EMAIL,
  bvcFromAddress,
  sendMail,
} from "@/lib/mailgun";
import { PACKETS } from "@/lib/packets";
import { TURNSTILE_FORM_FIELD, verifyTurnstile } from "@/lib/turnstile";

export type FormState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; message: string };

/**
 * Download the sample packet. Protected by Turnstile so scrapers can't
 * hammer the PDF. On success redirects to the file; on failure sends the
 * user back to /educators with a small error query param.
 *
 * v1 ships a single packet (Episode 1 Coffee ELA). Future expansion to
 * the full 8-packet matrix is tracked in
 * plans/future/multi-subject-packet-downloads.md.
 */
export async function downloadAction(formData: FormData): Promise<void> {
  const token = formData.get(TURNSTILE_FORM_FIELD);
  const ok = await verifyTurnstile(
    typeof token === "string" ? token : null
  );
  if (!ok) {
    redirect("/educators?err=bot-check");
  }
  const primary = PACKETS[0];
  if (!primary?.pdf) {
    redirect("/educators?err=packet-missing");
  }
  redirect(primary.pdf);
}

function missingFields(record: Record<string, string>): string[] {
  return Object.entries(record)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Pilot signup. Validates all required fields, verifies Turnstile,
 * then emails BAM via Mailgun with a [BVC Pilot] subject prefix and
 * an X-Witus-Form header so Gmail filters route cleanly.
 */
export async function pilotSignupAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const token = formData.get(TURNSTILE_FORM_FIELD);
  const botOk = await verifyTurnstile(
    typeof token === "string" ? token : null
  );
  if (!botOk) {
    return {
      status: "error",
      error: "Bot check failed. Please try again or refresh the page.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const subjects = formData.getAll("subjects").map(String).filter(Boolean);
  const grades = formData.getAll("grades").map(String).filter(Boolean);
  const years = String(formData.get("years-teaching") ?? "").trim();
  const timeline = String(formData.get("timeline") ?? "").trim();
  const students = String(formData.get("students-per-class") ?? "").trim();
  const howHeard = String(formData.get("how-heard") ?? "").trim();
  const interests = String(formData.get("commodity-interests") ?? "").trim();
  const other = String(formData.get("other") ?? "").trim();

  const missing = missingFields({
    name,
    email,
    role,
    school,
    district,
    country,
    "years-teaching": years,
    timeline,
  });
  if (subjects.length === 0) missing.push("subjects");
  if (grades.length === 0) missing.push("grades");

  if (missing.length > 0) {
    return {
      status: "error",
      error: `Please fill in: ${missing.join(", ")}.`,
    };
  }

  if (!isEmail(email)) {
    return {
      status: "error",
      error: "That email address looks off. Please double-check.",
    };
  }

  const subject = `[BVC Pilot] ${name}, ${school}, ${subjects.join("/")} (grades ${grades.join(",")})`;
  const text = [
    "New BVC pilot signup via witus.online/educators",
    "",
    `Name:             ${name}`,
    `Email:            ${email}`,
    `Role:             ${role}`,
    `School:           ${school}`,
    `District:         ${district}`,
    `Country:          ${country}`,
    `Subjects:         ${subjects.join(", ")}`,
    `Grade levels:     ${grades.join(", ")}`,
    `Years teaching:   ${years}`,
    `Timeline:         ${timeline}`,
    `Students / class: ${students || "(not provided)"}`,
    "",
    "How they heard about BVC:",
    howHeard || "(not provided)",
    "",
    "Commodity or episode interests:",
    interests || "(not provided)",
    "",
    "Anything else:",
    other || "(not provided)",
  ].join("\n");

  const result = await sendMail({
    to: BVC_SUBMISSIONS_EMAIL,
    from: bvcFromAddress(),
    subject,
    text,
    replyTo: email,
    headers: { "X-Witus-Form": "bvc-pilot-signup" },
  });

  if (!result.ok) {
    return {
      status: "error",
      error: `Submission did not reach BAM: ${result.detail ?? "unknown error"}. Please try again or email bvc.witus.submissions@witus.online directly.`,
    };
  }

  return {
    status: "success",
    message:
      "Thanks. BAM will follow up within a few days. Check your spam folder if you do not see a reply.",
  };
}

export const PACKETS_PUBLIC = PACKETS; // re-export so client form can read it
