export interface Recording {
  id: number;
  filename: string;
  date: string;
  duration: number | null;
  transcript: string | null;
  raw_result: unknown;
  created_at: string;
  conversation_count?: number;
}

export interface Conversation {
  id: number;
  recording_id: number;
  start_time: string | null;
  end_time: string | null;
  participants: string[];
  summary: string | null;
  context: string | null;
  created_at: string;
}

export interface Task {
  id: number;
  recording_id: number | null;
  conversation_id: number | null;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'done';
  created_at: string;
}

export interface Idea {
  id: number;
  recording_id: number | null;
  content: string;
  tags: string[];
  created_at: string;
}
