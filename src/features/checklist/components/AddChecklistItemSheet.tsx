import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { useProjects } from '@/features/projects/hooks';
import { useI18n } from '@/lib/i18n/context';
import { useCreateChecklistItem } from '../hooks';
import type { ChecklistPriority, ChecklistScope } from '../types';

interface AddChecklistItemSheetProps {
  open: boolean;
  onClose: () => void;
  scope: ChecklistScope;
}

export function AddChecklistItemSheet({ open, onClose, scope }: AddChecklistItemSheetProps) {
  const projects = useProjects();
  const create = useCreateChecklistItem();
  const { t } = useI18n();

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
      toast.error(t('checklist.errText'));
      return;
    }
    if (scope === 'company' && !projectId) {
      toast.error(t('checklist.errProject'));
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
      title={scope === 'company' ? t('checklist.newCompany') : t('checklist.newPrivate')}
    >
      <div className="flex flex-col gap-4">
        {scope === 'company' && (
          <Select
            label={t('checklist.project')}
            value={projectId}
            options={[
              { value: '', label: t('checklist.selectProject') },
              ...(projects.data ?? []).map((p) => ({ value: p.id, label: p.name })),
            ]}
            onChange={(e) => setProjectId(e.target.value)}
          />
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">
            {t('checklist.priority')}
          </span>
          <SegmentedControl
            options={(['high', 'medium', 'low'] as ChecklistPriority[]).map((p) => ({
              value: p,
              label: t(`priority.${p}`),
            }))}
            value={priority}
            onChange={(v) => setPriority(v as ChecklistPriority)}
          />
        </div>
        <Input
          label={t('checklist.taskText')}
          value={text}
          placeholder={t('checklist.taskPlaceholder')}
          onChange={(e) => setText(e.target.value)}
        />
        <Button size="lg" fullWidth loading={create.isPending} onClick={submit}>
          {t('checklist.addTask')}
        </Button>
      </div>
    </Sheet>
  );
}
