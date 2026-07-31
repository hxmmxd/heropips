/**
 * Remounts on every member-area navigation → replays the .ap-screen entrance
 * (150ms fade/rise, zeroed under prefers-reduced-motion by tokens.css).
 * Native screen-transition feel without a client boundary.
 */
export default function ScreenTemplate({ children }: { children: React.ReactNode }) {
  return <div className="ap-screen">{children}</div>;
}
