import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceRecorder } from '@/components/transactions/VoiceRecorder';

describe('VoiceRecorder', () => {
  const originalMediaRecorder = global.MediaRecorder;
  const originalNavigator = global.navigator;

  let mockTracks: { stop: ReturnType<typeof vi.fn> }[];
  let mockStream: { getTracks: () => typeof mockTracks };
  let mockMediaRecorderInstance: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    ondataavailable: ((e: { data: Blob }) => void) | null;
    onstop: (() => void) | null;
    onerror: ((err: unknown) => void) | null;
    state: string;
    mimeType: string;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockTracks = [{ stop: vi.fn() }];
    mockStream = { getTracks: () => mockTracks };
    mockMediaRecorderInstance = {
      start: vi.fn(),
      stop: vi.fn(function (this: typeof mockMediaRecorderInstance) {
        this.state = 'inactive';
        if (this.ondataavailable) this.ondataavailable({ data: new Blob(['mock audio'], { type: 'audio/webm' }) });
        if (this.onstop) this.onstop();
      }),
      ondataavailable: null, onstop: null, onerror: null, state: 'inactive', mimeType: 'audio/webm',
    };
    const MockMediaRecorder = vi.fn().mockImplementation(function () {
      mockMediaRecorderInstance.state = 'recording'; return mockMediaRecorderInstance;
    }) as unknown as typeof MediaRecorder;
    MockMediaRecorder.isTypeSupported = vi.fn((m: string) => m === 'audio/webm');
    global.MediaRecorder = MockMediaRecorder;
    Object.defineProperty(global, 'navigator', {
      value: { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockStream) } }, writable: true, configurable: true,
    });
  });

  afterEach(() => {
    global.MediaRecorder = originalMediaRecorder;
    Object.defineProperty(global, 'navigator', { value: originalNavigator, writable: true, configurable: true });
  });

  it('renders unsupported browser message when MediaRecorder is unavailable', () => {
    // @ts-expect-error test undefined
    delete global.MediaRecorder;
    render(<VoiceRecorder />);
    expect(screen.getByText(/no compatible|no disponible/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /grabar/i })).toBeNull();
  });

  it('handles microphone permission denial gracefully', async () => {
    const user = userEvent.setup(), err = new Error('Permission denied'); err.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    render(<VoiceRecorder />);
    await user.click(screen.getByRole('button', { name: /grabar/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/permiso de micr[oó]fono denegado/i));
  });

  it('completes recording flow and posts audio to API', async () => {
    const user = userEvent.setup(), onSuccess = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ transaction: { id: 'v-1' }, source: 'voice' }) });
    global.fetch = fetchMock;
    render(<VoiceRecorder onSuccess={onSuccess} />);
    await user.click(screen.getByRole('button', { name: /grabar/i }));
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true }));
    const stopBtn = await screen.findByRole('button', { name: /detener/i });
    await user.click(stopBtn);
    await waitFor(() => {
      expect(mockTracks[0].stop).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith('/api/transactions/audio', expect.objectContaining({ method: 'POST', body: expect.stringContaining('"mimeType":"audio/webm"') }));
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles empty recording blob gracefully without API submission', async () => {
    const user = userEvent.setup(), fetchMock = vi.fn(); global.fetch = fetchMock;
    mockMediaRecorderInstance.stop = vi.fn(function (this: typeof mockMediaRecorderInstance) {
      this.state = 'inactive'; if (this.onstop) this.onstop();
    });
    render(<VoiceRecorder />);
    await user.click(screen.getByRole('button', { name: /grabar/i }));
    await user.click(await screen.findByRole('button', { name: /detener/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/vac[ií]o/i));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles 422 extraction_failed with user alert and manual fallback hint', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ error: { code: 'extraction_failed', message: 'No se pudo interpretar el audio' } }) });
    render(<VoiceRecorder />);
    await user.click(screen.getByRole('button', { name: /grabar/i }));
    await user.click(await screen.findByRole('button', { name: /detener/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo interpretar el audio/i));
  });

  it('handles 503 voice_service_unavailable', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: { code: 'voice_service_unavailable', message: 'Servicio de voz no disponible' } }) });
    render(<VoiceRecorder />);
    await user.click(screen.getByRole('button', { name: /grabar/i }));
    await user.click(await screen.findByRole('button', { name: /detener/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/servicio de voz no disponible/i));
  });

  it('handles network failure during audio submission', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    render(<VoiceRecorder />);
    await user.click(screen.getByRole('button', { name: /grabar/i }));
    await user.click(await screen.findByRole('button', { name: /detener/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/error de red/i));
  });

  it('redirects to /login on 401 response', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'location', { writable: true, value: { href: '', assign: vi.fn() } });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { code: 'unauthorized', message: 'Unauthorized' } }) });
    render(<VoiceRecorder />);
    await user.click(screen.getByRole('button', { name: /grabar/i }));
    await user.click(await screen.findByRole('button', { name: /detener/i }));
    await waitFor(() => expect(window.location.href).toBe('/login'));
  });
});
