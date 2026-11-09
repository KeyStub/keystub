import { redirect } from "next/navigation";

/** Old address for the support inbox. */
export default function OldFeedbackInbox() {
  redirect("/admin/tickets");
}
