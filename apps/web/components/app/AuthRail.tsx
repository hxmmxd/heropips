/**
 * The left column of the auth split (≥960px). Sets the stakes for the form
 * beside it — the two auth screens differ only in this copy, which is what
 * makes login and redeem read as one flow.
 */
export function AuthRail({
  title,
  lede,
  points,
}: {
  title: string;
  lede: string;
  /** [heading, detail] — rendered as a numbered list, max three. */
  points: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <aside className="ap-auth-rail">
      <div className="ap-auth-rail-head">
        <h2 className="ap-auth-rail-title">{title}</h2>
        <p className="ap-auth-rail-lede">{lede}</p>
      </div>
      <ul className="ap-auth-points">
        {points.map(([heading, detail], i) => (
          <li key={heading} className="ap-auth-point">
            <span className="ap-auth-point-index" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <strong className="ap-auth-point-title">{heading}</strong>
              {detail}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
