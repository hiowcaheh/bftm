import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { useProjects } from '@/features/projects/hooks';
import { useCreateChecklistItem } from '../hooks';
import type { ChecklistPriority, ChecklistScope } from '../types';
import { PRIORITY_LABELS } from '../types';

interface AddChecklistItemSheetProps {
  open: boolean;
  onClose: () => void;
  scope: ChecklistScope;
}

export function AddChecklistItemSheet({ open, onClose, scope }: AddChecklistItemSheetProps) {
  const projects = useProjects();
  const create = useCreateChecklistItem();

  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<ChecklistPriority>('medium');
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) {
      setProjectId('');
      setPriority('medium');
      setText('');
    }
  }, [open]);

  const submit = () => {
    if (!text.trim()) {
      toast.error('Wpisz treść zadania');
      return;
    }
    if (scope === 'company' && !projectId) {
      toast.error('Wybierz projekt');
      return;
    }
    create.mutate(
      {
        scope,
        project_id: scope === 'company' ? projectId : null,
        priority,
        text,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={scope === 'company' ? 'Nowe zadanie firmowe' : 'Nowe zadanie prywatne'}
    >
      <div className="flex flex-col gap-4">
        {scope === 'company' && (
          <Select
            label="Projekt"
            value={projectId}
            options={[
              { value: '', label: 'Wybierz projekt' },
              ...(projects.data ?? []).map((p) => ({ value: p.id, label: p.name })),
            ]}
            onChange={(e) => setProjectId(e.target.value)}
          />
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">Priorytet</span>
          <SegmentedControl
            options={(['high', 'medium', 'low'] as ChecklistPriority[]).map((p) => ({
              value: p,
              label: PRIORITY_LABELS[p],
            }))}
            value={priority}
            onChange={(v) => setPriority(v as ChecklistPriority)}
          />
        </div>
        <Input
          label="Treść zadania"
          value={text}
          placeholder="Co trzeba zrobić?"
          onChange={(e) => setText(e.target.value)}
        />
        <Button size="lg" fullWidth loading={create.isPending} onClick={submit}>
          Dodaj zadanie
        </Button>
      </div>
    </Sheet>
  );
}
