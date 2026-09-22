'use client';

import { MicIcon, Volume2Icon } from 'lucide-react';
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
 * Compact voice utilities — secondary to the structured answer controls.
 * Visibility from `CoachStep.voice`; failures toast.
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
            // SpeechRecognition exposes result/error/end only via on* handlers.
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
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {voice.speak ? (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={speak}
                    iconLeft={<Volume2Icon className="size-3.5" aria-hidden />}>
                    {t('voice_read')}
                </Button>
            ) : null}
            {voice.listen ? (
                <Button
                    type="button"
                    variant={listening ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={toggleListen}
                    aria-pressed={listening}
                    iconLeft={<MicIcon className="size-3.5" aria-hidden />}>
                    {listening ? t('voice_listening') : t('voice_speak')}
                </Button>
            ) : null}
        </div>
    );
}
