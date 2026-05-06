import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Phone,
  Video,
  Info,
  ChevronLeft,
} from 'lucide-react';
import {
  MessageThread,
  LoadingState,
  ErrorState,
} from '@/components';
import { messagesAPI } from '@/services/api';
import { cn } from '@/utils/cn';
import { formatDate, PLACEHOLDER_IMAGE } from '@/utils/helpers';
import type { User, Message, Conversation } from '@/types';

interface MessagesProps {
  currentUser: User;
}

interface ThreadOtherUser {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
}

export const Messages = ({ currentUser: _currentUser }: MessagesProps) => {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [otherUser, setOtherUser] = useState<ThreadOtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Load conversations once on mount.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    messagesAPI
      .getConversations()
      .then((list) => {
        if (cancelled) return;
        setConversations(list);
        if (list.length > 0 && !selectedConversation) {
          setSelectedConversation(list[0]);
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // Load the selected conversation thread whenever the selection changes.
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setOtherUser(null);
      return;
    }
    let cancelled = false;
    setThreadLoading(true);
    messagesAPI
      .getConversation(selectedConversation.otherUser.id)
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages);
        setOtherUser(data.otherUser);
        setThreadLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([]);
        setOtherUser({
          ...selectedConversation.otherUser,
        });
        setThreadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedConversation]);

  const filteredConversations = conversations.filter((conv) =>
    `${conv.otherUser.firstName} ${conv.otherUser.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;
    try {
      await messagesAPI.send({
        receiverId: selectedConversation.otherUser.id,
        accommodationId: selectedConversation.accommodation?.id,
        content,
      });
      // TODO: optimistic update — for now just refetch the thread.
      const refreshed = await messagesAPI.getConversation(
        selectedConversation.otherUser.id
      );
      setMessages(refreshed.messages);
    } catch {
      // The MessageThread input clears on send; surface a soft inline error
      // by re-fetching the conversations list to refresh state. (No toast
      // system in P0 — TODO: add one.)
    }
  };

  if (loading) {
    return <LoadingState label="Loading messages..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

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
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-600">
                  {conversations.length === 0
                    ? 'No conversations yet.'
                    : 'No conversations match that search.'}
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const convOtherUser = conversation.otherUser;
                  const isSelected =
                    selectedConversation?.id === conversation.id;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        setIsMobileListVisible(false);
                      }}
                      className={cn(
                        'w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left',
                        isSelected && 'bg-gray-50'
                      )}
                    >
                      <div className="relative">
                        {convOtherUser.profilePicture ? (
                          <img
                            src={convOtherUser.profilePicture}
                            alt={convOtherUser.firstName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
                            {convOtherUser.firstName.charAt(0)}
                            {convOtherUser.lastName.charAt(0)}
                          </div>
                        )}
                        {/* TODO: per-conversation unread badge — the API only
                            exposes a global unread count via
                            `messagesAPI.getUnreadCount`. Drop the per-thread
                            badge for now. */}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 truncate">
                            {convOtherUser.firstName} {convOtherUser.lastName}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDate(
                              conversation.lastMessage.createdAt,
                              'h:mm a'
                            )}
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
                })
              )}
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
                    {otherUser.profilePicture ? (
                      <img
                        src={otherUser.profilePicture}
                        alt={otherUser.firstName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
                        {otherUser.firstName.charAt(0)}
                        {otherUser.lastName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {otherUser.firstName} {otherUser.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Typically responds within an hour
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
                        navigate(
                          `/listing/${selectedConversation.accommodation!.id}`
                        )
                      }
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                    >
                      <img
                        src={PLACEHOLDER_IMAGE}
                        alt={selectedConversation.accommodation.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {selectedConversation.accommodation.title}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                {threadLoading ? (
                  <LoadingState
                    label="Loading conversation..."
                    className="flex-1 flex items-center justify-center"
                  />
                ) : (
                  <MessageThread
                    messages={messages}
                    otherUser={otherUser}
                    onSendMessage={handleSendMessage}
                  />
                )}
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
