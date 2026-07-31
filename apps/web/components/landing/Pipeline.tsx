"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { BrandCard, Eyebrow } from "@heropips/ui";

/**
 * #pipeline — "How a decision is born". The differentiator section, one job:
 * the quant-data → feature → ML → guarded-execution rail, drawn as ONE ink
 * poster (the brand social-card surface) instead of four loose boxes.
 *
 * A volt rail carries the decision left→right: DATA IN terminal → nodes
 * 01·02·03·04 → arrowhead → TRADE OUT terminal. Nodes charge up along the
 * way — volt tint → pulse at the AI gate (03) → solid volt at execution
 * (04) — and a small data-pulse travels the rail continuously. Horizontal
 * ≥1240px, vertical timeline below. Rail + stages draw in once on scroll
 * (IntersectionObserver); static under prefers-reduced-motion and before
 * hydration (no-JS never hides content).
 */
const STAGES = [
  {
    num: "01",
    tag: "composite feeds",
    title: "Quant data",
    copy: "Institutional-grade composite feeds across FX, metals and crypto — cleaned, synced and time-stamped inside our own engine.",
    tone: "",
  },
  {
    num: "02",
    tag: "vol · momentum · regime",
    title: "Feature engine",
    copy: "Raw ticks become features: volatility state, momentum across horizons, and the market regime the model is trading in.",
    tone: "",
  },
  {
    num: "03",
    tag: "quant-ml-v1",
    title: "ML scoring",
    copy: "The model scores every setup. Only decisions above the confidence gate publish — each brief carries its confidence, model version and reasoning.",
    tone: "is-ai",
  },
  {
    num: "04",
    tag: "your broker",
    title: "Guarded execution",
    copy: "The brief executes on your own broker account, inside the Trade Guard rules you set. Your keys, your account, your limits.",
    tone: "is-out",
  },
] as const;

export function Pipeline() {
  const flowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = flowRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = el.getBoundingClientRect();
    const alreadyVisible = r.top < window.innerHeight && r.bottom > 0;
    if (reduce || alreadyVisible) {
      el.classList.add("is-in");
      return;
    }
    el.setAttribute("data-anim", "");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="section hp-pipe" id="pipeline" aria-labelledby="pipeline-h">
      <div className="container">
        <div className="hp-section-head">
          <Eyebrow>The pipeline</Eyebrow>
          <h2 id="pipeline-h">How a decision is born.</h2>
          <p>
            No resold third-party calls, no bare arrows. Every intelligence brief starts as raw
            market data inside our own quant engine and leaves with its reasoning attached.
          </p>
        </div>
        <BrandCard
          variant="ink"
          watermark
          badge="OWN ENGINE · END TO END"
          meta={{
            left: ["@heropips", "quant-ml-v1 · fx · metals · crypto"],
            right: "simulated output pre-launch\nbriefs informational\nnot investment advice",
          }}
          className="hp-pipe-poster"
        >
          <div className="hp-pipe-flow" ref={flowRef}>
            <span className="hp-pipe-end hp-pipe-end--in">data in</span>
            <span className="hp-pipe-end hp-pipe-end--out">trade out</span>
            <ol className="hp-pipe-rail">
              {STAGES.map((s) => (
                <li className={s.tone ? `hp-pipe-stage ${s.tone}` : "hp-pipe-stage"} key={s.num}>
                  <span className="hp-pipe-node" aria-hidden="true">{s.num}</span>
                  <span className="hp-pipe-tag">{s.tag}</span>
                  <h3>{s.title}</h3>
                  <p>{s.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </BrandCard>
        <div className="hp-pipe-foot">
          <Link href="/product/intelligence" className="hp-arrow-link">Go deeper: inside the intelligence engine →</Link>
        </div>
      </div>
    </section>
  );
}
