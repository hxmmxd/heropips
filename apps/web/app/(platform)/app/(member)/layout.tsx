import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar, TabBar, TopBar } from "@/components/app/AppNav";
import { OfflineBanner } from "@/components/app/OfflineBanner";

/**
 * Member shell: server-validated session (introspection, not just cookie
 * presence), desktop sidebar, mobile tab bar. No marketing chrome.
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/app/login");

  return (
    <div className="ap-root">
      <Sidebar user={user} />
      <div>
        <TopBar />
        <OfflineBanner />
        <main className="ap-content" id="main">
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}
