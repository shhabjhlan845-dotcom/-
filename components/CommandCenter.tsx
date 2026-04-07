
import React, { useState } from 'react';
import { executeAiCommand } from '../services/geminiService';
import { AIBrainIcon } from './common/Icons';

interface CommandCenterProps {
  documentText: string;
  onProcessingStart: () => void;
  onOutputGenerated: (url: string, fileName: string, text: string) => void;
  onError: (error: string) => void;
  disabled: boolean;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ documentText, onProcessingStart, onOutputGenerated, onError, disabled }) => {
  const [command, setCommand] = useState('');

  const handleSubmit = async () => {
    if (!command.trim()) {
        onError("يرجى إدخال أمر.");
        return;
    }
    onProcessingStart();
    try {
        const resultText = await executeAiCommand(documentText, command);
        const blob = new Blob([resultText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        onOutputGenerated(url, 'ai_response.txt', resultText);
    } catch(err) {
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
        onError(`فشل في تنفيذ الأمر: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-4" aria-disabled={disabled}>
      <label htmlFor="ai-command" className="block text-lg font-medium text-gray-300">
        اكتب أمرًا معقدًا (مثال: "لخص المستند"، "استخرج النقاط الرئيسية")
      </label>
      <textarea
        id="ai-command"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        rows={3}
        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-white resize-y"
        placeholder="أدخل طلبك هنا..."
        disabled={disabled}
        aria-label="خانة الأوامر الذكية"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 text-lg font-bold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-75 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
      >
        <AIBrainIcon />
        <span>نفذ الأمر الذكي</span>
      </button>
    </div>
  );
};
