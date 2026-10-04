import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import { profile } from "@/lib/content";
import { CopyButton } from "./CopyButton";

const routeLink =
  "group inline-flex min-h-11 items-center gap-1.5 font-medium underline decoration-line-strong decoration-1 underline-offset-4 transition-[text-decoration-color] duration-[var(--dur-micro)] hover:decoration-field hover:decoration-2";

/**
 * End card. One message (a short question), one call to action ("Email me",
 * the page-wide label, with copy beside it), the other routes as one quiet
 * row. It closes the page. Centered on purpose:
 * it is the page's closing statement and the only centered composition,
 * so it does not repeat the hero's split.
 */
export function Contact() {
  const { email, instagram, discord, malloy } = profile.contact;

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="pt-[clamp(3.5rem,10dvh,7rem)] pb-[clamp(4rem,12dvh,8rem)]"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col items-center px-4 text-center md:px-16">
        {profile.availableForWork && (
          <p className="inline-flex h-8 items-center gap-2 rounded-pill px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line-strong)] md:text-sm">
            <span aria-hidden className="size-2 rounded-full bg-field ring-1 ring-field-ink" />
            Available for work
          </p>
        )}

        <h2
          id="contact-title"
          className="mt-5 max-w-[14ch] font-display text-[clamp(2.75rem,min(7vw,12dvh),6.25rem)] leading-[0.92] font-extrabold tracking-[-0.045em] text-balance"
        >
          Have a video to edit?
        </h2>

        <p className="mt-5 max-w-[42ch] text-[clamp(1rem,1.4vw,1.25rem)] leading-relaxed text-muted">
          Send the footage link and a short brief by email, or message him on Instagram or Discord.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href={`mailto:${email}`} className="btn btn-primary">
            Email me
          </a>
          <CopyButton
            value={email}
            label="Copy email address"
            copiedLabel="Email address copied"
            failedMessage={`Copy failed. The address is ${email}.`}
            hideLabel
            className="btn-icon size-14"
            copiedClassName="btn-icon size-14 bg-field text-field-ink"
            statusClassName="basis-full text-sm text-muted"
          />
        </div>
        <p className="mt-3 text-sm text-muted select-all">{email}</p>

        <ul aria-label="Other ways to reach Vasant" className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-[15px] md:text-base">
          <li>
            <a href={instagram.url} target="_blank" rel="noopener noreferrer" className={routeLink}>
              Instagram <span className="text-muted">{instagram.handle}</span>
              <ArrowUpRightIcon aria-hidden weight="bold" className="size-3.5 transition-transform duration-[var(--dur-micro)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li className="inline-flex items-center gap-1.5 font-medium">
            Discord <span className="text-muted select-all">{discord}</span>
            <CopyButton
              value={discord}
              label="Copy Discord handle"
              copiedLabel="Discord handle copied"
              failedMessage="Copy failed. Select the handle to copy it."
              hideLabel
              iconSize={15}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-pill text-muted transition-colors duration-[var(--dur-micro)] hover:text-text"
              copiedClassName="inline-flex size-11 cursor-pointer items-center justify-center rounded-pill text-text"
              statusClassName="basis-full text-sm text-muted"
            />
          </li>
          <li>
            <a href={malloy} target="_blank" rel="noopener noreferrer" className={routeLink}>
              Hire via Malloy
              <ArrowUpRightIcon aria-hidden weight="bold" className="size-3.5 transition-transform duration-[var(--dur-micro)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        </ul>
      </div>

    </section>
  );
}
