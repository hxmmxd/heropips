import type { Metadata } from "next";
import "./app.css";

export const metadata: Metadata = {
  title: { default: "HeroPips App", template: "%s · HeroPips App" },
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return children;
}
