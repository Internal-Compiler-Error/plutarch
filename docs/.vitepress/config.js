export default {
  lang: "en-CA",
  title: "A (Much) Worse Plutarch",
  description: "A random brain dump of Internal Compiler Error, I am a much worse version of Plutarch.",
  lastUpdated: true,
  head: [
    ["script", { async: true, src: "https://www.googletagmanager.com/gtag/js?id=G-JN26VM45TW" }],
    [
      "script",
      {},
      "window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-JN26VM45TW');",
    ],
  ],
  themeConfig: {
    lastUpdatedText: "Last Updated At",
    sidebar: [
      {
        text: "Personal Dump",
        items: [{ text: "In Flames, How People Change", link: "/in-flames-summary" }],
      },
      {
        text: "Technical(-ish) Posts When I Procrastinated",
        items: [{ text: "Random Numbers Generations in C++", link: "/random-number-generation-in-c++" }],
      },
      {
        text: "Controversial",
        items: [{ text: "SENG at UoG is a Scam", link: "/seng-at-uog-is-a-scam" }],
      },
      {
        text: "Co-op Reports",
        items: [{ text: "Fall 2022", link: "/co-op-report-0" }],
      },
    ],
  },
  markdown: {
    config: (md) => {
      md.use(require("markdown-it-footnote"));
    },
  },
};
