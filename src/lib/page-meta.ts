/** Consistent document metadata for every ZavSync module page. */
export function setPageMeta(title: string, description: string) {
  if (typeof document === "undefined") return;
  document.title = `${title} — ZavSync`;
  const pairs: [string, string, string][] = [
    ["name", "description", description],
    ["property", "og:title", `${title} — ZavSync`],
    ["property", "og:description", description],
    ["property", "og:type", "website"],
    ["name", "twitter:card", "summary_large_image"],
  ];
  for (const [attr, key, content] of pairs) {
    let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attr, key);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  }
}
