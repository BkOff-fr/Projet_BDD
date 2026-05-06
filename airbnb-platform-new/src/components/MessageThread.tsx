import { useState, useRef, useEffect } from 'react';
import { Send, Image, Paperclip } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/helpers';
import type { Message } from '@/types';

interface ThreadOtherUser {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
}

interface MessageThreadProps {
  messages: Message[];
  otherUser: ThreadOtherUser;
  onSendMessage: (content: string) => void;
  className?: string;
}

export const MessageThread = ({
  messages,
  otherUser,
  onSendMessage,
  className,
}: MessageThreadProps) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const otherInitials = `${otherUser.firstName.charAt(0)}${otherUser.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        {otherUser.profilePicture ? (
          <img
            src={otherUser.profilePicture}
            alt={`${otherUser.firstName} ${otherUser.lastName}`}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
            {otherInitials}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">
            {otherUser.firstName} {otherUser.lastName}
          </p>
          <p className="text-sm text-gray-500">
            Typically responds within an hour
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Divider */}
            <div className="flex items-center justify-center mb-4">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
                {formatDate(date, 'MMMM d, yyyy')}
              </span>
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {dateMessages.map((message) => {
                const isCurrentUser = message.isFromMe;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] px-4 py-2.5 rounded-2xl',
                        isCurrentUser
                          ? 'bg-primary text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      )}
                    >
                      <p>{message.content}</p>
                      <p
                        className={cn(
                          'text-xs mt-1',
                          isCurrentUser ? 'text-white/70' : 'text-gray-500'
                        )}
                      >
                        {formatDate(message.createdAt, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-200 bg-white"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Image className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-2.5 bg-gray-100 rounded-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={cn(
              'p-2.5 rounded-full transition-colors',
              newMessage.trim()
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
