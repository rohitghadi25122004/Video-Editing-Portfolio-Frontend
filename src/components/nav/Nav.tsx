import { profile } from "@/lib/content";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const links = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
] as const;

/**
 * Sticky top bar. Desktop: wordmark, three anchors, theme toggle, "Email me".
 * Mobile: the anchors drop (one short page), leaving wordmark, toggle and a
 * compact "Email me" pill.
 */
export function Nav() {
  const mailto = `mailto:${profile.contact.email}`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg supports-[backdrop-filter:blur(1px)]:bg-bg/90 supports-[backdrop-filter:blur(1px)]:backdrop-blur-md">
      <a
        href="#work"
        className="btn btn-field btn-sm absolute left-4 top-2.5 z-50 -translate-y-[200%] focus-visible:translate-y-0 md:left-16 md:top-4 [--focus:var(--field-ink)] dark:[--focus:var(--text)]"
      >
        Skip to work
      </a>

      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 max-[359px]:px-3 md:h-[76px] md:gap-4 md:px-16">
        <a
          href="#top"
          className="font-display text-[1.3125rem] font-bold tracking-[-0.02em] whitespace-nowrap max-[359px]:text-lg md:text-2xl"
        >
          {profile.name}
        </a>

        <div className="flex items-center gap-2 md:gap-8">
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-7 text-base font-medium">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="decoration-field decoration-2 underline-offset-[6px] transition-colors duration-[160ms] hover:text-muted hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <a href={mailto} className="btn btn-primary btn-sm max-md:px-4 max-[359px]:px-3 max-[359px]:text-sm">
              Email me
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
