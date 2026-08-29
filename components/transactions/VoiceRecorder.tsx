'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isMediaRecorderSupported, getPreferredAudioMimeType, blobToBase64 } from '@/lib/audio';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export interface VoiceRecorderProps {
  onSuccess?: () => void | Promise<void>;
}

export function VoiceRecorder({ onSuccess }: VoiceRecorderProps): React.JSX.Element {
  const [supported, setSupported] = useState<boolean>(true);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'success' | 'error'>('idle');
  const [statusText, setStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setSupported(isMediaRecorderSupported() && getPreferredAudioMimeType() !== null);
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    setErrorMessage(null); setStatusText(''); chunksRef.current = [];
    const mimeType = getPreferredAudioMimeType();
    if (!mimeType) {
      setErrorMessage('No hay un formato de audio compatible disponible en este navegador.');
      setStatus('error'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onerror = () => { stopTracks(); setErrorMessage('Ocurrió un error durante la grabación.'); setStatus('error'); };
      recorder.start();
      setStatus('recording'); setStatusText('Grabando audio... Describa la transacción.');
    } catch (err: unknown) {
      stopTracks();
      const isDenied = err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setErrorMessage(isDenied ? 'Permiso de micrófono denegado. Permita el acceso o utilice el registro manual.' : 'No se pudo acceder al micrófono. Intente nuevamente o utilice el registro manual.');
      setStatus('error');
    }
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    setStatus('processing'); setStatusText('Procesando audio con IA...');
    recorder.onstop = async () => {
      stopTracks();
      const mimeType = recorder.mimeType || getPreferredAudioMimeType() || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size === 0) {
        setErrorMessage('El audio grabado está vacío. Intente nuevamente o use el registro manual.');
        setStatus('error'); return;
      }
      try {
        const base64 = await blobToBase64(blob);
        const res = await fetch('/api/transactions/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: base64, mimeType }) });
        if (res.status === 401) { window.location.href = '/login'; return; }
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setErrorMessage(data?.error?.message ?? (res.status === 422 ? 'No se pudo interpretar el audio. Verifique la claridad o utilice el formulario manual.' : res.status === 503 ? 'Servicio de voz no disponible temporalmente. Utilice el formulario manual.' : 'Error al procesar el audio.'));
          setStatus('error'); return;
        }
        setStatus('success'); setStatusText('Transacción interpretada y registrada correctamente.');
        if (onSuccess) await onSuccess();
      } catch {
        setErrorMessage('Error de red al enviar el audio. Verifique su conexión o utilice el registro manual.');
        setStatus('error');
      }
    };
    recorder.stop();
  };

  if (!supported) {
    return (
      <Card className="shadow-sm border-dashed">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight"><Mic className="h-4 w-4 text-muted-foreground" /> Registro por Voz</CardTitle>
        </CardHeader>
        <CardContent className="pb-4"><p className="text-sm text-muted-foreground">Grabación de voz no compatible o no disponible en este navegador. Utilice el formulario de registro manual.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="flex items-center justify-between text-base font-semibold tracking-tight">
          <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Registro por Voz con IA</span>
          <span className="text-xs font-normal text-muted-foreground">Gemini Flash</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <div aria-live="polite" aria-atomic="true" className="sr-only">{statusText || errorMessage || ''}</div>
        {errorMessage && (
          <div role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/15 p-3 text-sm text-destructive font-medium border border-destructive/25">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMessage}</span>
          </div>
        )}
        {status === 'success' && (
          <div role="status" className="flex items-center gap-2 rounded-xl bg-success/15 p-3 text-sm text-success font-medium border border-success/25">
            <CheckCircle2 className="h-4 w-4 shrink-0" /><span>Transacción registrada con éxito mediante voz.</span>
          </div>
        )}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 p-6 text-center bg-secondary/20">
          {status === 'idle' || status === 'error' || status === 'success' ? (
            <>
              <Button type="button" onClick={handleStartRecording} className="gap-2 min-h-[44px]" size="lg"><Mic className="h-5 w-5" /> Grabar transacción</Button>
              <p className="text-xs text-muted-foreground max-w-sm">Ejemplo: &ldquo;Gasté 4500 pesos en supermercado con Mercado Pago&rdquo;</p>
            </>
          ) : status === 'recording' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>
                <span className="text-sm font-semibold text-destructive">Grabando...</span>
              </div>
              <Button type="button" variant="destructive" onClick={handleStopRecording} className="gap-2 min-h-[44px]" size="lg"><Square className="h-4 w-4 fill-current" /> Detener y procesar</Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm font-medium">Extrayendo datos de la transacción...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
