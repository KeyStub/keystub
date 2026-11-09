import { PlaceholderHelp, TemplateEditor } from "@/components/admin";
import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS } from "@/lib/admin";
import { requireStaff } from "@/server/staff";

export const metadata = { title: "Auto-reply emails" };

export default async function AutoReplies() {
  await requireStaff("templates");
  const rows = await db.select().from(emailTemplates);
  return (
    <>
      <h1 className="adm-h1">Auto-reply emails</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Sent automatically from support@keystub.com as soon as someone submits a ticket. Each type of ticket gets its own message.
      </p>
      <PlaceholderHelp />
      <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
        {TEMPLATE_KEYS.map((k) => {
          const r = rows.find((x) => x.key === k.key);
          return (
            <TemplateEditor
              key={k.key + (r?.updatedAt.getTime() ?? 0)}
              tpl={{ key: k.key, label: k.label, ...(r ? { subject: r.subject, body: r.body, enabled: r.enabled, edited: true, updatedBy: r.updatedBy } : { ...DEFAULT_TEMPLATES[k.key], enabled: true, edited: false }) }}
            />
          );
        })}
      </div>
    </>
  );
}
