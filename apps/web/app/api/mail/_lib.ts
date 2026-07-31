/**
 * Mail tracking link shape: `<sendId>.<hmac>`. The signature is what makes
 * `recordOpen`/`recordClick` un-forgeable, so an id that does not match is
 * rejected before any upstream hop — no DB write, no enumeration oracle.
 * Both handlers pass the matched value through verbatim; every pixel in
 * every already-delivered email depends on this exact shape.
 */
export const MAIL_TRACKING_ID = /^[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]{16,64}$/;

/** Click-through targets are validated against the public origin downstream; cap the length here. */
export const MAX_CLICK_URL = 2048;
