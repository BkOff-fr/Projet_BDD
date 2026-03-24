import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MoreHorizontal,
  Phone,
  Video,
  Info,
  ChevronLeft,
} from 'lucide-react';
import { MessageThread } from '@/components';
import { conversations, users } from '@/data/mockData';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/helpers';
import type { User, Message } from '@/types';

interface MessagesProps {
  currentUser: User;
}

export const Messages = ({ currentUser }: MessagesProps) => {
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState(
    conversations[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  // Get messages for selected conversation
  const conversationMessages = messages.filter(
    (m) =>
      m.senderId === selectedConversation?.participants[0].id ||
      m.receiverId === selectedConversation?.participants[0].id
  );

  const filteredConversations = conversations.filter((conv) => {
    const otherUser = conv.participants.find((p) => p.id !== currentUser.id);
    return otherUser?.firstName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `m${Date.now()}`,
      senderId: currentUser.id,
      sender: currentUser,
      receiverId: selectedConversation.participants.find((p) => p.id !== currentUser.id)!.id,
      receiver: selectedConversation.participants.find((p) => p.id !== currentUser.id)!,
      content,
      createdAt: new Date(),
      isRead: false,
      accommodationId: selectedConversation.accommodation?.id,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const otherUser = selectedConversation?.participants.find(
    (p) => p.id !== currentUser.id
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto h-[calc(100vh-80px)]">
        <div className="flex h-full border border-gray-200 rounded-xl overflow-hidden">
          {/* Conversations List */}
          <div
            className={cn(
              'w-full md:w-80 border-r border-gray-200 flex flex-col',
              !isMobileListVisible && 'hidden md:flex'
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conversation) => {
                const otherUser = conversation.participants.find(
                  (p) => p.id !== currentUser.id
                );
                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      setIsMobileListVisible(false);
                    }}
                    className={cn(
                      'w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left',
                      selectedConversation?.id === conversation.id && 'bg-gray-50'
                    )}
                  >
                    <div className="relative">
                      <img
                        src={otherUser?.avatar}
                        alt={otherUser?.firstName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {conversation.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900 truncate">
                          {otherUser?.firstName} {otherUser?.lastName}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatDate(conversation.lastMessage.createdAt, 'h:mm a')}
                        </span>
                      </div>
                      {conversation.accommodation && (
                        <p className="text-xs text-gray-500 truncate">
                          Re: {conversation.accommodation.title}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 truncate mt-0.5">
                        {conversation.lastMessage.content}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Thread */}
          <div
            className={cn(
              'flex-1 flex flex-col',
              isMobileListVisible && 'hidden md:flex'
            )}
          >
            {selectedConversation && otherUser ? (
              <>
                {/* Thread Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsMobileListVisible(true)}
                      className="md:hidden p-2 hover:bg-gray-100 rounded-full"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <img
                      src={otherUser.avatar}
                      alt={otherUser.firstName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {otherUser.firstName} {otherUser.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {otherUser.isHost ? 'Host' : 'Guest'} • Typically responds within an hour
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <Phone className="w-5 h-5 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <Video className="w-5 h-5 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <Info className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Accommodation Context */}
                {selectedConversation.accommodation && (
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div
                      onClick={() =>
                        navigate(`/listing/${selectedConversation.accommodation!.id}`)
                      }
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                    >
                      <img
                        src={selectedConversation.accommodation.images[0]}
                        alt={selectedConversation.accommodation.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {selectedConversation.accommodation.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedConversation.accommodation.location.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-sm">
                          ${selectedConversation.accommodation.pricePerNight}
                        </p>
                        <p className="text-xs text-gray-500">/night</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <MessageThread
                  messages={conversationMessages.length > 0 ? conversationMessages : [
                    {
                      id: 'welcome',
                      senderId: otherUser.id,
                      sender: otherUser,
                      receiverId: currentUser.id,
                      receiver: currentUser,
                      content: `Hi! Thanks for your interest. How can I help you?`,
                      createdAt: new Date(Date.now() - 86400000),
                      isRead: true,
                    }
                  ]}
                  currentUser={currentUser}
                  otherUser={otherUser}
                  onSendMessage={handleSendMessage}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-600">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
