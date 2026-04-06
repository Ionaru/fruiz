import { PageShell } from "../layout/PageShell.tsx";
import type { CategoryRow } from "../../lib/categories.ts";
import type { ComponentChildren } from "preact";

export interface QuizPlayerProps {
  category: CategoryRow;
  children: ComponentChildren;
}

export function QuizPlayer(props: Readonly<QuizPlayerProps>) {
  return (
    <PageShell paddingY="6">
      <div class="max-w-lg mx-auto flex flex-col gap-6 text-base-900 dark:text-base-100">
        <header class="plateau rounded-2xl p-5">
          <p class="text-sm opacity-80">Category</p>
          <h1 class="text-2xl font-semibold">{props.category.name}</h1>
        </header>
        {props.children}
      </div>
    </PageShell>
  );
}
