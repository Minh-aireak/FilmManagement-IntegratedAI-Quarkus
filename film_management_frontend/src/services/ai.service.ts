import api from './api';
import { type ChatRequest, type ChatResponse } from '../types';

export const aiService = {
  sendMessage: async (chatRequest: ChatRequest) => {
    const response = await api.post<ChatResponse>(
      '/ai/chat',
      chatRequest,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },
};
