export const PREFERRED_AUDIO_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'] as const;

export function isMediaRecorderSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(navigator?.mediaDevices?.getUserMedia) && typeof window.MediaRecorder !== 'undefined';
}

export function getPreferredAudioMimeType(): string | null {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return null;
  for (const mime of PREFERRED_AUDIO_MIMES) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.includes(',') ? reader.result.split(',')[1] : reader.result);
      } else reject(new Error('Failed to convert Blob to base64 string'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}
