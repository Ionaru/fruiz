import type { ComponentChildren } from "preact";

export interface AdminListHeaderProps {
  title: string;
  actions: ComponentChildren;
}

export function AdminListHeader(props: Readonly<AdminListHeaderProps>) {
  return (
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
        {props.title}
      </h1>
      <div class="flex flex-wrap gap-2">{props.actions}</div>
    </div>
  );
}
