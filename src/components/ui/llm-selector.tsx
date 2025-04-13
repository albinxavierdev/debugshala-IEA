import React from 'react';
import { Label } from './label';

// Only supporting OpenAI
export type LLMProvider = 'openai';

interface LLMSelectorProps {
  label?: string;
  className?: string;
}

export function LLMSelector({ label = "AI Model", className }: LLMSelectorProps) {
  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <div className="flex items-center p-2 border rounded-md h-10">
        <span className="h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
        <span>OpenAI (GPT)</span>
      </div>
    </div>
  );
} 