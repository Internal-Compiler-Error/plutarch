export default {
  title: "A (Much) Worse Plutarch",
  description: "A random brain dump of Internal Compiler Error, I am a much worse version of Plutarch.",
  themeConfig: {
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
    ],
  },
  markdown: {
    config: (md) => {
      md.use(require("markdown-it-footnote"));
    },
  },
};
