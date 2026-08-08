export type VocabWord = {
  id: number;
  chinese: string;
  pinyin: string;
  meaning: string | null;
  category?: string | null;
};

export function VocabTable({
  words,
  grouped = false,
}: {
  words: VocabWord[];
  grouped?: boolean;
}) {
  if (!grouped) {
    return <VocabTableGroup words={words} />;
  }

  const groups = new Map<string, VocabWord[]>();
  for (const word of words) {
    const key = word.category ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(word);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[...groups.entries()].map(([category, groupWords]) => (
        <div key={category}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{category}</h2>
          {/* No enforced min-width here (unlike the standalone case below) —
              each category's table already lives in a narrow grid column by
              design, and forcing the same ~32rem min-width per table made
              every column need its own inner horizontal scroll at both
              tablet and desktop widths, which is worse than the plain
              table-layout wrapping it had before (docs/24). */}
          <VocabTableGroup words={groupWords} constrainWidth={false} />
        </div>
      ))}
    </div>
  );
}

// Exported so pages that just need the bare Chinese/Pinyin/English table
// (e.g. the landing page's small static preview) can reuse it instead of
// duplicating this markup.
export function VocabTableGroup({
  words,
  constrainWidth = true,
}: {
  words: VocabWord[];
  // False for the grouped multi-column layout above, where each table
  // already sits in a narrow column on purpose — see the comment there.
  constrainWidth?: boolean;
}) {
  return (
    // Scrolls horizontally inside its own card rather than forcing the page
    // wider (docs/hold/24-responsive-design-plan.md) — the table keeps a sane
    // min-width so its three columns don't crush illegibly on a narrow
    // screen, and the wrapper (not the table) owns the border/rounding so it
    // stays visible while the table content scrolls under it.
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className={`w-full text-sm ${constrainWidth ? "min-w-lg" : ""}`}>
        <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Chinese</th>
            <th className="px-3 py-2">Pinyin</th>
            <th className="px-3 py-2">English</th>
          </tr>
        </thead>
        <tbody>
          {words.map((word) => (
            <tr key={word.id} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{word.chinese}</td>
              <td className="px-3 py-2 text-muted-foreground">{word.pinyin}</td>
              <td className="px-3 py-2">{word.meaning ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
