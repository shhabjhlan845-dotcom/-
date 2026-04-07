export interface FileData {
  name: string;
  type: string;
  base64: string;
}

export type ProcessingState = 'idle' | 'processing' | 'ready' | 'done' | 'error';

export type OutputFormat = 'txt' | 'docx' | 'mp3' | 'wav';

export interface VoiceOption {
  name: string;
  value: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { name: 'Zephyr (ذكر - افتراضي للمحادثة)', value: 'Zephyr' },
  { name: 'Kore (أنثى)', value: 'Kore' },
  { name: 'Puck (ذكر)', value: 'Puck' },
  { name: 'Charon (ذكر)', value: 'Charon' },
  { name: 'Fenrir (ذكر)', value: 'Fenrir' },
];
