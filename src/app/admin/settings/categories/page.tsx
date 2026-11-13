import { count, eq } from "drizzle-orm";
import { CategoryManager } from "@/components/admin";
import { db } from "@/db";
import { feedback, supportCategories } from "@/db/schema";
import { requireStaff } from "@/server/staff";

export const metadata = { title: "Ticket categories" };

export default async function Categories() {
  await requireStaff("templates");
  const rows = await db
    .select({ id: supportCategories.id, name: supportCategories.name, tickets: count(feedback.id) })
    .from(supportCategories)
    .leftJoin(feedback, eq(feedback.category, supportCategories.name))
    .groupBy(supportCategories.id)
    .orderBy(supportCategories.sort);
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="adm-h1">Ticket categories</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        File each ticket under a category from the ticket page. Over time the counts on Overview show what customers need help with most, so you know
        what to fix or explain better. Keep the list short: about 8 to 15 categories works best.
      </p>
      <CategoryManager rows={rows} />
    </div>
  );
}
