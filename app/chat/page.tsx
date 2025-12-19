'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DockMenu } from '@/components/dock-menu';

const AI_PROVIDERS = [
  { id: 'doubao', name: 'Doubao', url: 'https://www.doubao.com/chat' },
  { id: 'qwen', name: 'Qwen', url: 'https://chat.qwen.ai/' },
  { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn/' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
  { id: 'chatglm', name: 'ChatGLM', url: 'https://chat.z.ai' },
];

export default function ChatPage() {
  const [selectedProvider, setSelectedProvider] = useState('doubao');

  const getCurrentProvider = () => {
    return AI_PROVIDERS.find(provider => provider.id === selectedProvider) || AI_PROVIDERS[0];
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <div className="container flex-1 py-6">
        <Card className="mx-auto h-full max-w-6xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Multi-AI Chat</span>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100vh-220px)] p-0">
            <iframe
              src={getCurrentProvider().url}
              className="h-full w-full rounded-lg border-0"
              title={`${getCurrentProvider().name} Chat`}
              allow="clipboard-write"
            />
          </CardContent>
        </Card>
      </div>
      <DockMenu />
    </div>
  );
}