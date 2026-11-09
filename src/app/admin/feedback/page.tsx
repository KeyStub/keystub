import { redirect } from "next/navigation";
import { adminPath } from "@/lib/admin";

/** Old address for the support inbox. */
export default function OldFeedbackInbox() {
  redirect(adminPath("/admin/tickets"));
}
