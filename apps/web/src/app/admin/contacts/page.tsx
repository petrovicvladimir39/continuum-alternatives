import { CHANNELS } from "@continuum/shared";
import { asc, contactStatusSplit, contacts, db } from "@continuum/db";
import { toggleContactUnsubscribedAction } from "@/app/admin/actions";
import { DataTable } from "@/components/ui/data-table";
import { formatTimestamp } from "../sources/run-status";
import { ContactForm } from "./contact-form";

export default async function AdminContactsPage() {
  const [rows, split] = await Promise.all([
    db.select().from(contacts).orderBy(asc(contacts.email)),
    contactStatusSplit(),
  ]);

  return (
    <div>
      <h1 className="type-h2">Contacts</h1>
      <p className="mt-2 text-[13px] text-ink-muted">
        Subscribers and report-gate leads. Public signup is double opt-in; digests send to
        status <span className="type-data">active</span> only.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-y border-line py-2.5">
        {(["active", "pending_confirmation", "unsubscribed"] as const).map((status) => (
          <span key={status} className="flex items-baseline gap-1.5">
            <span className="type-data font-medium">{split[status] ?? 0}</span>
            <span className="type-label">{status.replace("_", " ")}</span>
          </span>
        ))}
      </div>
      <div className="mt-6">
        <ContactForm channels={[...CHANNELS]} />
      </div>
      <div className="mt-8">
        {rows.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No contacts.</p>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Channels</th>
                <th>Consent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.email}</td>
                  <td>{contact.name ?? ""}</td>
                  <td>{(contact.channels ?? []).join(", ")}</td>
                  <td className="type-data">
                    {contact.consentSource ?? ""} {formatTimestamp(contact.consentedAt)}
                  </td>
                  <td>
                    <form action={toggleContactUnsubscribedAction}>
                      <input type="hidden" name="contactId" value={contact.id} />
                      <button
                        type="submit"
                        className={`text-[11px] font-medium uppercase tracking-wide hover:text-accent ${
                          contact.unsubscribedAt === null ? "text-equity" : "text-ink-muted"
                        }`}
                      >
                        {contact.unsubscribedAt === null ? "subscribed" : "unsubscribed"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </div>
  );
}
