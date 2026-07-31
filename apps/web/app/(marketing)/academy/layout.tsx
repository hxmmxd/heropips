import type { Metadata } from "next";
import "@/components/academy/academy.css";

/**
 * Academy segment brand suffix. Lesson and verify pages used to append
 * "· HeroPips Academy" by hand, which the root template then re-branded into
 * "… · HeroPips Academy · HeroPips". Owning the suffix here means child
 * titles carry the section name exactly once and the root template never
 * fires for them.
 */
export const metadata: Metadata = {
  title: { template: "%s · HeroPips Academy", default: "HeroPips Academy" },
};

/**
 * Academy chrome: loads the .ac-* design language once for every academy
 * route and pins the sticky XP HUD just below the marketing header
 * (64px bar + 1px border).
 */
export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ ["--ac-hud-top" as string]: "65px" }}>{children}</div>;
}
