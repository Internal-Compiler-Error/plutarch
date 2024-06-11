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
        items: [
          { text: "Random Numbers Generations in C++", link: "/random-number-generation-in-c++" },
          // {
          //   text: "Atomic Memory Ordering for People Used to ACID Isolation levels",
          //   link: "/atomic-memory-order-in-the-lens-of-acid-isolation.md",
          // },
          {
            text: "Scripting Language Import is Strictly More Powerful than Compiled Languages Imports",
            link: "/scripting-import-is-strictly-more-powerful.md"
          },
          {
            text: "DNS On Modern Linux is a Mess",
            link: "/modern-linux-dns-mess.md"
          },
          {
            text: "READ COMMITED won't save you from MySQL Gap Locks",
            link: "/mysql-read-commited-gap-lock.md"
          }
        ],
      },
      {
        text: "Controversial",
        items: [{ text: "SENG at UoG is a Scam", link: "/seng-at-uog-is-a-scam" }],
      },
      {
        text: "Co-op Reports",
        items: [
          { text: "Fall 2022", link: "/co-op-report-0" }, 
          { text: "Summer 2023", link: "/co-op-report-1" },
          { text: "Winter 2024", link: "/co-op-report-2" },
        ],
      },
    ],
  },
  markdown: {
    config: (md) => {
      md.use(require("markdown-it-footnote"));
    },
  },
};
