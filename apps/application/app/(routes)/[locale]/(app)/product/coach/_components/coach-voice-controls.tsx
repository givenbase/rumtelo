'use client';

import { useRef, useState } from 'react';

import type { CoachStepVoice } from '@rumtelo/contracts';
import { COACH_SPEECH_BCP47, fromIntlLocale } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useAppShell } from '@/components/features/shell/app-shell-context';

type Props = {
    prompt: string;
    /** From `CoachStep.voice` — contract source of truth for which controls to show. */
    voice: CoachStepVoice;
    onHeard: (transcript: string) => void;
    className?: string;
};

/**
 * Web Speech session handle — typed against the DOM SpeechRecognition shape.
 * Construction goes through {@link createSpeechRecognition}; failures surface as toasts.
 */
type SpeechRecognitionSession = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

function createSpeechRecognition(): SpeechRecognitionSession {
    const scope = globalThis as typeof globalThis & {
        SpeechRecognition?: new () => SpeechRecognitionSession;
        webkitSpeechRecognition?: new () => SpeechRecognitionSession;
    };
    const Ctor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
    if (!Ctor) {
        throw new Error('SPEECH_RECOGNITION_UNAVAILABLE');
    }
    return new Ctor();
}

function speakPrompt(prompt: string, bcp47: string): void {
    const synthesis = globalThis.speechSynthesis;
    if (!synthesis) {
        throw new Error('SPEECH_SYNTHESIS_UNAVAILABLE');
    }
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(prompt);
    utterance.lang = bcp47;
    synthesis.speak(utterance);
}

/**
 * Voice I/O for a Coach step. Visibility comes from `CoachStep.voice` (session contract).
 * Engine failures toast — UI is not gated on browser capability sniffing.
 */
export function CoachVoiceControls({ prompt, voice, onHeard, className }: Props) {
    const t = useTranslations('features.coach.session');
    const locale = useLocale();
    const { showToast } = useAppShell();
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionSession | null>(null);

    if (!voice.speak && !voice.listen) return null;

    const bcp47 = COACH_SPEECH_BCP47[fromIntlLocale(locale)];

    const speak = () => {
        try {
            speakPrompt(prompt, bcp47);
        } catch {
            showToast(t('voice_unavailable'), 'error');
        }
    };

    const toggleListen = () => {
        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
            return;
        }
        try {
            const recognition = createSpeechRecognition();
            recognitionRef.current = recognition;
            recognition.lang = bcp47;
            recognition.interimResults = false;
            recognition.continuous = false;
            // SpeechRecognition exposes result/error/end only via on* handlers (not addEventListener).
            recognition.onresult = event => {
                const transcript = event.results[0]?.[0]?.transcript?.trim();
                if (transcript) onHeard(transcript);
            };
            recognition.onerror = () => setListening(false);
            recognition.onend = () => setListening(false);
            recognition.start();
            setListening(true);
        } catch {
            showToast(t('voice_unavailable'), 'error');
        }
    };

    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {voice.speak ? (
                <Button type="button" variant="ghost" size="sm" onClick={speak}>
                    {t('voice_read')}
                </Button>
            ) : null}
            {voice.listen ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleListen}
                    aria-pressed={listening}>
                    {listening ? t('voice_listening') : t('voice_speak')}
                </Button>
            ) : null}
        </div>
    );
}
