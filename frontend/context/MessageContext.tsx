import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

export type MessageType = 'info' | 'error' | 'warn' | 'success';

type MessageContextType = {
  message: string | null;
  messageType: MessageType;
  setMessage: (msg: string | null, type?: MessageType) => void;
  clearMessage: () => void;
};

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider = ({ children }: { children: ReactNode }) => {
  const [message, setMessageState] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>('info');

  const setMessage = useCallback((msg: string | null, type?: MessageType) => {
    setMessageState(msg);
    if (type) {
      setMessageType(type);
    }
  }, []);

  const clearMessage = useCallback(() => {
    setMessageState(null);
  }, []);

  return (
    <MessageContext.Provider value={{ message, messageType, setMessage, clearMessage }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) throw new Error('useMessage must be used within MessageProvider');
  return context;
};