import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, ListChecks, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/lib/cn';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useChecklist,
  useChecklistRealtime,
  useDeleteChecklistItem,
  useToggleChecklistItem,
} from '../hooks';
import type { ChecklistItem, ChecklistScope } from '../types';
import { PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_ORDER } from '../types';
import { AddChecklistItemSheet } from './AddChecklistItemSheet';

function sortItems(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      b.created_at.localeCompare(a.created_at),
  );
}

export function ChecklistSection() {
  const { can } = useSession();
  const hasPrivate = can('checklist_private');

  useChecklistRealtime();

  const [scope, setScope] = useState<ChecklistScope>('company');
  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ChecklistItem | null>(null);

  const activeScope: ChecklistScope = scope === 'private' && !hasPrivate ? 'company' : scope;
  const company = useChecklist('company');
  const privateList = useChecklist('private', hasPrivate);
  const source = activeScope === 'company' ? company : privateList;

  const toggle = useToggleChecklistItem();
  const del = useDeleteChecklistItem();

  const items = useMemo(() => sortItems(source.data ?? []), [source.data]);
  const openCount = items.filter((i) => !i.done).length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ListChecks className="size-5 text-accent" strokeWidth={1.8} /> Check-lista
        </h2>
        <button
          type="button"
          aria-label="Dodaj zadanie"
          onClick={() => setAddOpen(true)}
          className="press flex size-9 items-center justify-center rounded-full bg-accent text-white"
        >
          <Plus className="size-5" />
        </button>
      </div>

      {hasPrivate && (
        <SegmentedControl
          options={[
            { value: 'company', label: 'Firmowa' },
            { value: 'private', label: 'Prywatna' },
          ]}
          value={activeScope}
          onChange={setScope}
        />
      )}

      <Card className="flex flex-col p-2">
        {source.isLoading ? (
          <p className="px-2 py-6 text-center text-sm text-text-secondary">Ładowanie…</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-text-secondary">
            {activeScope === 'company'
              ? 'Brak zadań — dodaj pierwsze przyciskiem +.'
              : 'Twoja prywatna lista jest pusta — dodaj coś przyciskiem +.'}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {items.map((it) => (
              <div key={it.id} className="flex items-start gap-2.5 px-1 py-2.5">
                <button
                  type="button"
                  aria-label={it.done ? 'Odznacz' : 'Zaznacz jako zrobione'}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: it.id, done: !it.done })}
                  className="press mt-0.5 shrink-0"
                >
                  {it.done ? (
                    <CheckCircle2 className="size-6 text-success" strokeWidth={2} />
                  ) : (
                    <Circle className="size-6 text-text-secondary/40" strokeWidth={1.8} />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm',
                      it.done && 'text-text-secondary line-through',
                    )}
                  >
                    {it.text}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: PRIORITY_COLORS[it.priority] }}
                      />
                      {PRIORITY_LABELS[it.priority]}
                    </span>
                    {it.projectName && (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: it.projectColor ?? '#9E9E9E' }}
                        />
                        {it.projectName}
                      </span>
                    )}
                    <span>
                      {it.done && it.doneByName
                        ? `✓ ${it.doneByName}`
                        : it.createdByName
                          ? `dodał ${it.createdByName}`
                          : ''}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Usuń zadanie"
                  onClick={() => setToDelete(it)}
                  className="press mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!source.isLoading && items.length > 0 && (
        <p className="px-1 text-xs text-text-secondary">
          {openCount === 0
            ? 'Wszystko odhaczone 🎉'
            : `${openCount} ${openCount === 1 ? 'zadanie' : openCount < 5 ? 'zadania' : 'zadań'} do zrobienia`}
        </p>
      )}

      <AddChecklistItemSheet open={addOpen} onClose={() => setAddOpen(false)} scope={activeScope} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Usunąć zadanie?"
        description={toDelete?.text ?? ''}
        confirmLabel="Usuń"
        destructive
        loading={del.isPending}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
