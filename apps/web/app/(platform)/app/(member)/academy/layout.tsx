import "@/components/academy/academy.css";

/**
 * Academy segment shell: loads the .ac-* design language once and pins the
 * sticky XP HUD below the app top bar (57px + notch). .ap-screen keeps the
 * .ap-content column rhythm for the fragments inside.
 */
export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="ap-screen"
      style={{ "--ac-hud-top": "calc(57px + env(safe-area-inset-top))" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
