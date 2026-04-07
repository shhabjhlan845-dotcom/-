import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import type { LiveSession, LiveCallbacks } from '@google/genai';
import { decode, decodeAudioData, createAudioBlob } from '../utils/audioUtils';
import { VOICE_OPTIONS } from '../types';
import { MicIcon, StopIcon } from './common/Icons';

interface LiveModeProps {
    documentText: string;
    disabled: boolean;
}

const MAX_CONTEXT_CHARS = 50000; // Limit document context to prevent overly large requests

export const LiveMode: React.FC<LiveModeProps> = ({ documentText, disabled }) => {
    const [isLive, setIsLive] = useState(false);
    const [userTranscript, setUserTranscript] = useState('');
    const [modelTranscript, setModelTranscript] = useState('');
    const [history, setHistory] = useState<{ user: string, model: string }[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    // Audio output refs
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const stopLiveSession = useCallback(async () => {
        setIsLive(false);

        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.warn("Error closing session, it might have already been closed:", e);
            }
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if(outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            await outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;

    }, []);

    const startLiveSession = useCallback(async () => {
        if (isLive) return;

        setIsLive(true);
        setHistory([]);
        setUserTranscript('');
        setModelTranscript('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            // FIX: Cast window to `any` to allow access to the non-standard `webkitAudioContext` for older browser compatibility.
            audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            // FIX: Cast window to `any` to allow access to the non-standard `webkitAudioContext` for older browser compatibility.
            outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const callbacks: LiveCallbacks = {
                onopen: () => {
                    if (!audioContextRef.current || !mediaStreamRef.current) return;
                    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                    const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createAudioBlob(inputData);
                        if(sessionPromiseRef.current){
                            sessionPromiseRef.current.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        }
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(audioContextRef.current.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    let currentModelTranscript = '';
                    let currentUserTranscript = '';

                    if (message.serverContent?.inputTranscription) {
                        currentUserTranscript = message.serverContent.inputTranscription.text;
                        setUserTranscript(prev => prev + currentUserTranscript);
                    }
                    if (message.serverContent?.outputTranscription) {
                        currentModelTranscript = message.serverContent.outputTranscription.text;
                        setModelTranscript(prev => prev + currentModelTranscript);
                    }
                    if(message.serverContent?.turnComplete) {
                        setHistory(prev => {
                            const finalUser = userTranscript + currentUserTranscript;
                            const finalModel = modelTranscript + currentModelTranscript;
                            return [...prev, { user: finalUser, model: finalModel }];
                        });
                        setUserTranscript('');
                        setModelTranscript('');
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        source.addEventListener('ended', () => {
                            sourcesRef.current.delete(source);
                        });
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        sourcesRef.current.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error("Live session error:", e);
                    stopLiveSession();
                },
                onclose: (e: CloseEvent) => {
                    // This can be triggered by session.close(), so we don't need to call it again.
                    console.log("Live session closed.");
                }
            };

            const truncatedDocument = documentText.length > MAX_CONTEXT_CHARS 
                ? documentText.substring(0, MAX_CONTEXT_CHARS) + "\n\n...[المستند طويل جدًا وتم اقتطاعه]"
                : documentText;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks,
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
                    systemInstruction: `أنت مساعد صوتي ذكي. مهمتك هي الإجابة على أسئلة المستخدم حول المستند التالي. كن موجزًا ومباشرًا. المستند هو:\n\n---\n${truncatedDocument}\n---`,
                }
            });

        } catch (error) {
            console.error("Failed to start live session:", error);
            setIsLive(false);
        }

    }, [isLive, documentText, stopLiveSession, userTranscript, modelTranscript, selectedVoice]);
    
    useEffect(() => {
        return () => {
            stopLiveSession();
        };
    }, [stopLiveSession]);

    return (
        <div className="space-y-4" aria-disabled={disabled}>
            <p className="text-lg text-gray-300">تحدث صوتيًا مع المستند (مثلاً: "اقرأ لي من الصفحة 20"، "لخص هذه الفقرة").</p>
            <div className='space-y-4'>
                 <label htmlFor="live-voice-select" className="block text-lg font-medium text-gray-300">اختر صوت المساعد:</label>
                  <select
                    id="live-voice-select"
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-white"
                    disabled={disabled || isLive}
                    aria-disabled={disabled || isLive}
                  >
                    {VOICE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.name}</option>)}
                </select>
            </div>
            <button
                onClick={isLive ? stopLiveSession : startLiveSession}
                disabled={disabled}
                className={`w-full flex items-center justify-center gap-3 px-6 py-4 text-xl font-bold text-white rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-75 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-300 ${isLive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-green-600 hover:bg-green-700 focus:ring-green-400'}`}
                aria-live="polite"
            >
                {isLive ? <><StopIcon /><span>إيقاف الوضع المباشر</span></> : <><MicIcon /><span>تفعيل وضع "Open Live"</span></>}
            </button>
            {isLive && (
                <div className="mt-4 p-4 bg-gray-800 border border-gray-700 rounded-lg max-h-96 overflow-y-auto">
                    <h3 className="text-xl font-bold text-yellow-400 mb-4">سجل المحادثة</h3>
                    <div className="space-y-4">
                        {history.map((turn, index) => (
                            <div key={index}>
                                <p><strong className="text-blue-300">أنت:</strong> {turn.user}</p>
                                <p><strong className="text-green-300">المساعد:</strong> {turn.model}</p>
                            </div>
                        ))}
                        {userTranscript && <p className="opacity-75"><strong className="text-blue-300">أنت:</strong> {userTranscript}...</p>}
                        {modelTranscript && <p className="opacity-75"><strong className="text-green-300">المساعد:</strong> {modelTranscript}...</p>}
                    </div>
                </div>
            )}
        </div>
    );
};
