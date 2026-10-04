import type { Metadata } from "next";
import { siteTitle } from "@/lib/site";

/**
 * /admin on the public site: forwards to the admin panel served by the
 * backend (NEXT_PUBLIC_API_URL). A plain meta refresh, so it works on any
 * static host without JavaScript, and it stays out of search results.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const adminUrl = apiUrl ? `${apiUrl}/admin/` : null;

export const metadata: Metadata = {
  title: `Admin, ${siteTitle}`,
  robots: { index: false, follow: false },
};

export default function AdminRedirect() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-5 px-4">
      {adminUrl ? <meta httpEquiv="refresh" content={`0;url=${adminUrl}`} /> : null}
      <h1 className="font-display text-headline font-extrabold">Admin</h1>
      {adminUrl ? (
        <>
          <p className="text-lg text-muted">Opening the admin panel. The first visit can take up to a minute while the server wakes up.</p>
          <a href={adminUrl} className="btn btn-primary">
            Open the admin panel
          </a>
        </>
      ) : (
        <p className="text-lg text-muted">The admin panel is not set up for this site yet.</p>
      )}
    </main>
  );
}
