import { useEffect } from 'react';
import { useSite, useReveal } from '../lib/SiteContext.jsx';
import Hero from '../components/Hero.jsx';
import Ticker from '../components/Ticker.jsx';
import Lineup from '../components/Lineup.jsx';
import Squad from '../components/Squad.jsx';
import Fixtures from '../components/Fixtures.jsx';
import Standings from '../components/Standings.jsx';
import Club from '../components/Club.jsx';
import Gallery from '../components/Gallery.jsx';
import Footer from '../components/Footer.jsx';

export default function Home() {
  const { data, error, reload } = useSite();
  useReveal([!!data]);

  useEffect(() => {
    if (data?.content?.clubName) document.title = `${data.content.clubName} — Official Website`;
  }, [data?.content?.clubName]);

  if (!data) {
    return (
      <div className="boot">
        <img src="/images/crest-sm.png" alt="Hope From Football Club" />
        {error && (
          <p>
            {error}. <button onClick={reload}>Try again</button>
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <Hero />
      <Ticker />
      <Lineup />
      <Squad />
      <Fixtures />
      <Standings />
      <Club />
      <Gallery />
      <Footer />
    </>
  );
}
