import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@heropips/ui";
import { getSession } from "@/lib/session";
import { DisplayNameForm, LogoutButton } from "@/components/app/SettingsForms";
import { ThemePicker } from "@/components/theme/ThemePicker";
import "@/components/theme/theme-picker.css";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/app/login");

  return (
    <>
      <section className="ap-panel" aria-label="Profile">
        <div className="ap-panel-head">
          <h2 className="ap-panel-title">Profile</h2>
          <div className="ap-panel-side">
            {user.founding ? <Badge tone="volt">Founding</Badge> : null}
          </div>
        </div>
        <div style={{ padding: "var(--sp-4) var(--sp-5) var(--sp-5)" }}>
          <p className="ap-note" style={{ marginBottom: "var(--sp-4)" }}>
            Signed in as <span style={{ color: "var(--text-hi)" }}>{user.email}</span>
          </p>
          <DisplayNameForm current={user.display_name} />
        </div>
      </section>

      <section className="ap-panel" aria-label="Appearance">
        <div className="ap-panel-head">
          <h2 className="ap-panel-title">Appearance</h2>
        </div>
        <div style={{ padding: "var(--sp-4) var(--sp-5) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)", alignItems: "flex-start" }}>
          <p className="ap-note" style={{ margin: 0 }}>
            System follows your OS preference. Picking Dark or Light pins it on this device.
          </p>
          <ThemePicker />
        </div>
      </section>

      <section className="ap-panel" aria-label="Session">
        <div className="ap-panel-head">
          <h2 className="ap-panel-title">Session</h2>
        </div>
        <div style={{ padding: "var(--sp-4) var(--sp-5) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)", alignItems: "flex-start" }}>
          <p className="ap-note" style={{ margin: 0 }}>
            Signs this device out. Other sessions stay active — manage them under Security.
          </p>
          <LogoutButton />
        </div>
      </section>
    </>
  );
}
