// Mock RSS XML fixture for SRF news feed tests

export const mockRssXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Schweiz – News aus dem Inland – SRF</title>
    <link>https://www.srf.ch/news/schweiz</link>
    <pubDate>Sun, 08 Mar 2026 12:00:00 +0100</pubDate>
    <description>News aus der Schweiz</description>
    <language>ger-DE</language>
    <item>
      <title>Pestizide und Trinkwasserqualität – das ewige Dilemma</title>
      <link>https://www.srf.ch/news/schweiz/pestizide-trinkwasser</link>
      <pubDate>Sun, 08 Mar 2026 12:29:07 +0100</pubDate>
      <guid>urn:srf:article:001</guid>
      <description>&lt;img src="https://www.srf.ch/img/test.webp" /&gt;Die Räte wollen Zulassung von Pestiziden erleichtern.</description>
    </item>
    <item>
      <title>Zürcher Stadtrat – Wer schafft den Sprung?</title>
      <link>https://www.srf.ch/news/schweiz/wahlen-zuerich</link>
      <pubDate>Sun, 08 Mar 2026 11:03:10 +0100</pubDate>
      <guid>urn:srf:article:002</guid>
      <description>&lt;img src="https://www.srf.ch/img/test2.webp" /&gt;Die Stadt Zürich wählt eine neue Regierung.</description>
    </item>
    <item>
      <title>Störche in der Schweiz – Braucht es die Storchenväter noch?</title>
      <link>https://www.srf.ch/news/schweiz/stoerche-schweiz</link>
      <pubDate>Sun, 08 Mar 2026 10:33:47 +0100</pubDate>
      <guid>urn:srf:article:003</guid>
      <description>Jahrelang kümmerte sich ein Aargauer um Störche in seinem Dorf.</description>
    </item>
  </channel>
</rss>`;

export const mockRssXmlInternational = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>International – News aus dem Ausland – SRF</title>
    <link>https://www.srf.ch/news/international</link>
    <pubDate>Sun, 08 Mar 2026 12:00:00 +0100</pubDate>
    <description>News aus dem Ausland</description>
    <language>ger-DE</language>
    <item>
      <title>Italiens Parteien in Bewegung – Ein rechter Ex-General fordert Meloni heraus</title>
      <link>https://www.srf.ch/news/international/italien-meloni</link>
      <pubDate>Sun, 08 Mar 2026 10:00:00 +0100</pubDate>
      <guid>urn:srf:article:101</guid>
      <description>Ein früherer General tritt als Herausforderer an.</description>
    </item>
    <item>
      <title>Ukraine-Krieg – Neue Verhandlungsrunde in Genf</title>
      <link>https://www.srf.ch/news/international/ukraine-krieg-genf</link>
      <pubDate>Sun, 08 Mar 2026 09:15:00 +0100</pubDate>
      <guid>urn:srf:article:102</guid>
      <description>Die Gespräche finden unter Schweizer Vermittlung statt.</description>
    </item>
  </channel>
</rss>`;

export const mockRssXmlEconomy = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Wirtschaft – News aus der Schweizer- und Weltwirtschaft – SRF</title>
    <link>https://www.srf.ch/news/wirtschaft</link>
    <pubDate>Sun, 08 Mar 2026 12:00:00 +0100</pubDate>
    <description>News aus der Wirtschaft</description>
    <language>ger-DE</language>
    <item>
      <title>Starker Franken – Wie Firmen mit dem Wechselkurs umgehen</title>
      <link>https://www.srf.ch/news/wirtschaft/franken-wechselkurs</link>
      <pubDate>Sun, 08 Mar 2026 08:00:00 +0100</pubDate>
      <guid>urn:srf:article:201</guid>
      <description>Der starke Franken macht Schweizer Exportunternehmen zu schaffen.</description>
    </item>
  </channel>
</rss>`;

export const mockRssXmlEmpty = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed – SRF</title>
    <link>https://www.srf.ch/news/empty</link>
    <pubDate>Sun, 08 Mar 2026 12:00:00 +0100</pubDate>
    <description>Empty feed</description>
  </channel>
</rss>`;

export const mockRssXmlHtmlEntities = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed – SRF</title>
    <item>
      <title>Test &amp; HTML &lt;entities&gt; &quot;quoted&quot; &#39;apostrophe&#39; &nbsp;space</title>
      <link>https://www.srf.ch/test</link>
      <pubDate>Sun, 08 Mar 2026 08:00:00 +0100</pubDate>
      <guid>urn:srf:article:301</guid>
      <description>&lt;b&gt;Bold text&lt;/b&gt; and &amp;amp; entities &nbsp;here</description>
    </item>
  </channel>
</rss>`;

// Parsed article objects for assertions
export const expectedArticle1 = {
  title: "Pestizide und Trinkwasserqualität – das ewige Dilemma",
  description: "Die Räte wollen Zulassung von Pestiziden erleichtern.",
  link: "https://www.srf.ch/news/schweiz/pestizide-trinkwasser",
  published: "Sun, 08 Mar 2026 12:29:07 +0100",
};

export const expectedArticle2 = {
  title: "Zürcher Stadtrat – Wer schafft den Sprung?",
  description: "Die Stadt Zürich wählt eine neue Regierung.",
  link: "https://www.srf.ch/news/schweiz/wahlen-zuerich",
  published: "Sun, 08 Mar 2026 11:03:10 +0100",
};
