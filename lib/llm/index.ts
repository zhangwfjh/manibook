interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: 'text'; text: string } | { type: 'image'; image: Uint8Array } | { type: 'image_url'; image_url: { url: string } }>;
    images?: Array<string>;
};

interface ChatRequestOption {
    model: string;
    apiKey?: string;
    baseURL?: string;
    stream?: boolean;
    think?: boolean;
    response_format?: 'text' | 'json_object';
    temperature?: number;
};

export async function ollamaCall(messages: Array<Message>, options?: ChatRequestOption) {
    const { model, baseURL, stream, think, temperature } = options || {};
    const url = `${baseURL ? baseURL : 'http://localhost:11434'}/api/chat`;
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            model: model || 'qwen3:30b',
            messages: messages,
            think: think || true,
            stream: stream || false,
            temperature: temperature || 1,
        })
    });
    return await response.json();
}

export async function openaiCall(messages: Array<Message>, options?: ChatRequestOption) {
    const { model, apiKey, baseURL, stream, response_format, temperature } = options || {};
    const url = `${baseURL ? baseURL : 'https://api.openai.com/v1'}/chat/completions`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey || process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            response_format: { type: response_format || 'text' },
            stream: stream || false,
            temperature: temperature || 1,
        })
    });
    return await response.json();
}
