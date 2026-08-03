import { Layers } from "lucide-react";
import { requireSession } from "@/lib/require-session";
import { getLevelsOverviewWithChapters } from "@/lib/queries";
import { CustomQuizPicker } from "@/components/CustomQuizPicker";

export default async function CustomQuizPage() {
  await requireSession();
  const levels = await getLevelsOverviewWithChapters();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Layers size={22} className="text-muted-foreground" />
        Custom Quiz
      </h1>
      <p className="text-muted-foreground">
        Pick a level, then either the combined quiz or 2+ individual chapters to review
        together. Not tracked on the leaderboard — practice only.
      </p>

      <CustomQuizPicker
        levels={levels.map((level) => ({
          slug: level.slug,
          name: level.name,
          chapters: level.chapters,
        }))}
      />
    </main>
  );
}
