import { About } from "@/components/about/About";
import { Contact } from "@/components/contact/Contact";
import { Hero } from "@/components/hero/Hero";
import { Nav } from "@/components/nav/Nav";
import { Player } from "@/components/player/Player";
import { Work } from "@/components/work/Work";
import { ContentProvider } from "@/lib/content-context";
import { profile } from "@/lib/content";
import { siteUrl } from "@/lib/site";

// Only fields that exist in content/vasant.json.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.role,
  description: profile.bio,
  url: `${siteUrl}/`,
  image: `${siteUrl}/media/profile.jpg`,
  email: `mailto:${profile.contact.email}`,
  address: { "@type": "PostalAddress", addressCountry: "IN" },
  knowsLanguage: profile.language,
  knowsAbout: [...profile.software, ...profile.aiTools],
  sameAs: [profile.contact.instagram.url, profile.contact.malloy],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c") }}
      />
      <ContentProvider>
        <Nav />
        <main>
          <Hero />
          <Work />
          <About />
          <Contact />
        </main>
        <Player />
      </ContentProvider>
    </>
  );
}
