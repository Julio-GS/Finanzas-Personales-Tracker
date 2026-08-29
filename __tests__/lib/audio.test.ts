import { describe, it, expect, vi, afterEach } from 'vitest';
import { isMediaRecorderSupported, getPreferredAudioMimeType, blobToBase64 } from '@/lib/audio';

describe('lib/audio', () => {
  const origMR = global.MediaRecorder, origNav = global.navigator;
  afterEach(() => {
    global.MediaRecorder = origMR;
    Object.defineProperty(global, 'navigator', { value: origNav, writable: true, configurable: true });
    vi.restoreAllMocks();
  });

  it('checks isMediaRecorderSupported correctly across browser states', () => {
    global.MediaRecorder = vi.fn() as unknown as typeof MediaRecorder;
    Object.defineProperty(global, 'navigator', { value: { mediaDevices: { getUserMedia: vi.fn() } }, writable: true, configurable: true });
    expect(isMediaRecorderSupported()).toBe(true);
    // @ts-expect-error test undefined
    delete global.MediaRecorder;
    expect(isMediaRecorderSupported()).toBe(false);
    global.MediaRecorder = vi.fn() as unknown as typeof MediaRecorder;
    Object.defineProperty(global, 'navigator', { value: { mediaDevices: {} }, writable: true, configurable: true });
    expect(isMediaRecorderSupported()).toBe(false);
  });

  it('selects preferred audio mime type with proper fallback order', () => {
    global.MediaRecorder = { isTypeSupported: vi.fn((m: string) => m === 'audio/webm;codecs=opus') } as unknown as typeof MediaRecorder;
    expect(getPreferredAudioMimeType()).toBe('audio/webm;codecs=opus');
    global.MediaRecorder = { isTypeSupported: vi.fn((m: string) => m === 'audio/webm') } as unknown as typeof MediaRecorder;
    expect(getPreferredAudioMimeType()).toBe('audio/webm');
    global.MediaRecorder = { isTypeSupported: vi.fn((m: string) => m === 'audio/mp4') } as unknown as typeof MediaRecorder;
    expect(getPreferredAudioMimeType()).toBe('audio/mp4');
    global.MediaRecorder = { isTypeSupported: vi.fn(() => false) } as unknown as typeof MediaRecorder;
    expect(getPreferredAudioMimeType()).toBeNull();
  });

  it('converts a blob to a base64 string', async () => {
    const text = 'hello world audio';
    const blob = new Blob([text], { type: 'audio/webm' });
    const base64 = await blobToBase64(blob);
    expect(typeof base64).toBe('string');
    expect(Buffer.from(base64, 'base64').toString('utf-8')).toBe(text);
  });
});
