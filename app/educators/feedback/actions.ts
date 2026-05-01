"use server";

import { after } from "next/server";
import { sendToInbox } from "@/lib/inbox-sender";
import {
  BVC_SUBMISSIONS_EMAIL,
  bvcFromAddress,
  sendMail,
} from "@/lib/mailgun";
import { PACKETS, packetById } from "@/lib/packets";
import { TURNSTILE_FORM_FIELD, verifyTurnstile } from "@/lib/turnstile";
import type { FormState } from "@/app/educators/actions";

/**
 * Post-use feedback submission. Teachers reach this via a QR code on
 * the teacher packet itself; the packet id ships in as `?packet=` and
 * the form prefills it.
 */
export async function feedbackAction(
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

  const packetId = String(formData.get("packet") ?? "").trim();
  const subjectTaught = String(formData.get("subject-taught") ?? "").trim();
  const grades = formData.getAll("grades").map(String).filter(Boolean);
  const country = String(formData.get("country") ?? "").trim();
  const students = String(formData.get("students") ?? "").trim();
  const whatWorked = String(formData.get("what-worked") ?? "").trim();
  const whatDidnt = String(formData.get("what-didnt") ?? "").trim();
  const recommend = String(formData.get("recommend") ?? "").trim();
  const rating = String(formData.get("rating") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!packetId || !PACKETS.some((p) => p.id === packetId)) {
    return {
      status: "error",
      error: "Please select which packet you used.",
    };
  }
  const missing: string[] = [];
  if (!subjectTaught) missing.push("subject taught");
  if (grades.length === 0) missing.push("grade levels");
  if (!country) missing.push("country");
  if (!students) missing.push("students");
  if (!whatWorked) missing.push("what worked");
  if (!whatDidnt) missing.push("what didn't work");
  if (!recommend) missing.push("recommendation");
  if (!rating) missing.push("rating");
  if (missing.length > 0) {
    return {
      status: "error",
      error: `Please fill in: ${missing.join(", ")}.`,
    };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      status: "error",
      error: "That email address looks off. Leave it blank if you do not want to be contacted.",
    };
  }

  const packet = packetById(packetId);
  const packetLabel = packet?.label ?? packetId;

  const subject = `[BVC Feedback] ${packetLabel} rating ${rating}/5`;
  const text = [
    "New BVC teacher feedback via witus.online/educators/feedback",
    "",
    `Packet:         ${packetLabel}`,
    `Subject taught: ${subjectTaught}`,
    `Grade levels:   ${grades.join(", ")}`,
    `Country:        ${country}`,
    `Students:       ${students}`,
    `Recommend:      ${recommend}`,
    `Rating:         ${rating}/5`,
    "",
    "What worked:",
    whatWorked,
    "",
    "What didn't work:",
    whatDidnt,
    "",
    `Name:  ${name || "(anonymous)"}`,
    `Email: ${email || "(not provided, no follow-up requested)"}`,
  ].join("\n");

  const result = await sendMail({
    to: BVC_SUBMISSIONS_EMAIL,
    from: bvcFromAddress(),
    subject,
    text,
    replyTo: email || undefined,
    headers: { "X-Witus-Form": "bvc-feedback" },
  });

  if (!result.ok) {
    return {
      status: "error",
      error: `Submission did not reach BAM: ${result.detail ?? "unknown error"}. Try again in a minute or email bvc.witus.submissions@witus.online directly.`,
    };
  }

  after(async () => {
    const inbox = await sendToInbox({
      inboxUrl:   process.env.INBOX_INGEST_URL!,
      sourceSlug: process.env.INBOX_SOURCE_SLUG!,
      hmacSecret: process.env.INBOX_INGEST_SECRET!,
      submission: {
        form_type: "bvc-feedback",
        priority: "normal",
        ...(email && { submitter_email: email }),
        ...(name && { submitter_name: name }),
        payload: {
          packet: packetId,
          "subject-taught": subjectTaught,
          grades,
          country,
          students,
          "what-worked": whatWorked,
          "what-didnt": whatDidnt,
          recommend,
          rating,
        },
      },
    });
    if (!inbox.ok) {
      console.error("[inbox-sender] failed", {
        source: process.env.INBOX_SOURCE_SLUG,
        form_type: "bvc-feedback",
        http_status: inbox.status,
      });
    }
  });

  if (result.detail === "dev-log") {
    return {
      status: "success",
      message:
        "Feedback received. Mailgun is not configured on this deploy, so the submission was logged to the server console instead of emailed. Check MAILGUN_API_KEY and MAILGUN_DOMAIN.",
    };
  }

  return {
    status: "success",
    message:
      "Thank you. Your feedback goes straight to BAM. If you left your email, expect a short follow-up.",
  };
}
