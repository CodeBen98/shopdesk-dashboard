import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://d566e7e2b1b23b36f4e6f944d6a0deab@o4511187267747840.ingest.us.sentry.io/4511187272269824",
  tracesSampleRate: 0.1,
  debug: false,
});
