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
};

export async function ollamaCall(messages: Array<Message>, options?: ChatRequestOption) {
    const { model, baseURL, stream, think } = options || {};
    const url = `${baseURL ? baseURL : 'http://localhost:11434'}/api/chat`;
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            model: model || 'qwen3:30b',
            messages: messages,
            think: think || true,
            stream: stream || false,
            // temperature: 1,
        })
    });
    return await response.json();
}

export async function vllmCall(messages: Array<Message>, options?: ChatRequestOption) {
    const { model, apiKey, baseURL, stream, response_format } = options || {};
    const url = `${baseURL ? baseURL : 'http://localhost:8000/v1'}/chat/completions`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            response_format: { type: response_format || 'text' },
            stream: stream || false
        })
    });
    return await response.json();
}

export async function qwenCall(messages: Array<Message>, options?: ChatRequestOption) {
    const { model, apiKey, baseURL, stream, think, response_format } = options || {};
    const url = `${baseURL ? baseURL : 'https://dashscope.aliyuncs.com/compatible-mode/v1/'}/chat/completions`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey || process.env.DASHSCOPE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model || 'qwen-plus',
            messages: messages,
            enable_thinking: think || true,
            response_format: { type: response_format || 'text' },
            stream: stream || false
        })
    });
    return await response.json();
}

export async function zaiCall(messages: Array<Message>, options?: ChatRequestOption) {
    const { model, apiKey, baseURL, stream, think, response_format } = options || {};
    const url = `${baseURL ? baseURL : 'https://open.bigmodel.cn/api/paas/v4/'}/chat/completions`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey || process.env.ZAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model || 'glm-4.5-flash',
            messages: messages,
            thinking: { type: think ? "enabled" : "disabled" },
            response_format: { type: response_format || 'text' },
            stream: stream || false
        })
    });
    return await response.json();
}
