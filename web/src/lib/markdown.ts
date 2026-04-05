import type { Recording, Conversation, Task, Idea } from '@/lib/types';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function recordingToMarkdown(
  recording: Recording,
  conversations: Conversation[],
  tasks: Task[],
  ideas: Idea[],
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${recording.filename}`);
  lines.push('');
  lines.push(`- **日付**: ${recording.date}`);
  lines.push(`- **長さ**: ${formatDuration(recording.duration)}`);
  lines.push('');

  // Transcript
  if (recording.transcript) {
    lines.push('## トランスクリプト');
    lines.push('');
    lines.push(recording.transcript);
    lines.push('');
  }

  // Conversations
  if (conversations.length > 0) {
    lines.push('## 会話');
    lines.push('');
    for (const conv of conversations) {
      const time = [conv.start_time, conv.end_time].filter(Boolean).join(' - ');
      const ctx = conv.context ? ` [${conv.context}]` : '';
      lines.push(`### ${time}${ctx}`);
      if (conv.participants && conv.participants.length > 0) {
        lines.push(`**参加者**: ${conv.participants.join(', ')}`);
      }
      if (conv.summary) {
        lines.push('');
        lines.push(conv.summary);
      }
      lines.push('');
    }
  }

  // Tasks
  if (tasks.length > 0) {
    lines.push('## タスク');
    lines.push('');
    for (const task of tasks) {
      const check = task.status === 'done' ? 'x' : ' ';
      const prio = task.priority !== 'medium' ? ` (${task.priority})` : '';
      lines.push(`- [${check}] ${task.description}${prio}`);
    }
    lines.push('');
  }

  // Ideas
  if (ideas.length > 0) {
    lines.push('## アイデア');
    lines.push('');
    for (const idea of ideas) {
      const tags = idea.tags && idea.tags.length > 0 ? ` — ${idea.tags.map(t => `#${t}`).join(' ')}` : '';
      lines.push(`- ${idea.content}${tags}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
