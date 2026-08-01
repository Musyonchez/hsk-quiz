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
    <div className="columns-[260px] gap-6">
      {[...groups.entries()].map(([category, groupWords]) => (
        <div key={category} className="mb-6 break-inside-avoid">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{category}</h2>
          <VocabTableGroup words={groupWords} />
        </div>
      ))}
    </div>
  );
}

// Exported so pages that just need the bare Chinese/Pinyin/English table
// (e.g. the landing page's small static preview) can reuse it instead of
// duplicating this markup.
export function VocabTableGroup({ words }: { words: VocabWord[] }) {
  return (
    <table className="w-full overflow-hidden rounded-lg border border-border text-sm">
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
  );
}
