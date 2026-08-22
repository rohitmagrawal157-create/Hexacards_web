/** Server-only reCAPTCHA secret (never import from client components). */

const DEV_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

export function getRecaptchaSecretKey() {
  return (
    process.env.RECAPTCHA_SECRET_KEY?.trim() ||
    (process.env.NODE_ENV !== "production" ? DEV_SECRET_KEY : "")
  );
}
