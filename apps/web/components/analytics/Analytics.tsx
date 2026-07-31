"use client";

import * as React from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { consentGranted, readConsent } from "@/lib/analytics";

/* =========================================================================
 * GA4 loader with Consent Mode v2 — defaults everything to DENIED before
 * gtag.js ever runs, so nothing is stored or sent until the visitor allows
 * it via the ConsentBanner. Renders nothing when NEXT_PUBLIC_GA4_ID is
 * unset (zero script tags, zero bytes shipped).
 * ======================================================================= */

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export function Analytics() {
  if (!GA4_ID) return null;
  return <GaScripts id={GA4_ID} />;
}

function GaScripts({ id }: { id: string }) {
  const pathname = usePathname();
  const firstPageview = React.useRef(true);

  // Returning visitor who already allowed analytics: lift consent (and load
  // Clarity) without showing the banner again.
  React.useEffect(() => {
    if (readConsent() === "granted") consentGranted();
  }, []);

  // SPA navigations: `config` with send_page_view covers the first load;
  // fire explicit page_view events only on subsequent route changes.
  React.useEffect(() => {
    if (firstPageview.current) {
      firstPageview.current = false;
      return;
    }
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
    });
  }, [pathname]);

  // Consent defaults MUST be queued before the gtag.js loader executes.
  const bootstrap =
    `window.dataLayer=window.dataLayer||[];` +
    `function gtag(){dataLayer.push(arguments);}window.gtag=gtag;` +
    `gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});` +
    `gtag('js',new Date());` +
    `gtag('config',${JSON.stringify(id)},{anonymize_ip:true,send_page_view:true});`;

  // CSP: script-src carries no 'unsafe-inline'. Neither <Script> below needs an
  // explicit nonce — Next reads the per-request CSP from the request header
  // middleware.ts sets and hands the nonce to next/script through
  // HeadManagerContext, which stamps it on both the queue tag it renders and
  // the element loadScript() creates. 'strict-dynamic' covers the same
  // injection for browsers that support it. Do not switch these to a raw
  // <script>: that would be parser-inserted and blocked without a nonce.
  return (
    <>
      <Script id="hp-ga4-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: bootstrap }} />
      <Script
        id="hp-ga4-lib"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
      />
    </>
  );
}
