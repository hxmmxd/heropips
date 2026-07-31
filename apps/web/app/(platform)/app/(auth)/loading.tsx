import { LevelLoader } from "@heropips/ui";

/* Primary page loader per brand spec — the level-up chevrons, not a skeleton:
 * auth pages have no content shape worth preserving. Rendered inside
 * (auth)/layout.tsx, so the brand bar is already on screen. */
export default function AuthLoading() {
  return (
    <div className="ap-auth-loading" aria-busy="true">
      <LevelLoader size="lg" label="Checking your access…" showLabel />
    </div>
  );
}
