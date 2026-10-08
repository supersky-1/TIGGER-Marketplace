import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

interface User {
  _id: string;
  name: string;
  email?: string;
}

interface Message {
  _id: string;
  sender: { _id: string; name: string };
  receiver: { _id: string; name: string };
  content: string;
  createdAt: string;
}

interface Conversation {
  user: User;
  lastMessage: string;
  lastMessageAt: string;
}

function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(() => {
    const userId = searchParams.get("user");
    const userName = searchParams.get("name");

    return userId && userName ? { _id: userId, name: userName } : null;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get("/api/messages/conversations");
        setConversations(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(
          `/api/messages/conversation/${selectedUser._id}`
        );
        setMessages(res.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const res = await api.post("/api/messages", {
        receiverId: selectedUser._id,
        content: newMessage.trim(),
      });

      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
    } catch (error) {
      console.error(error);
      alert("Failed to send message");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Messages</h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden flex h-[calc(100dvh-13rem)] min-h-[360px] max-h-[720px] md:h-[70vh] md:min-h-[480px]">
          {/* Conversations List */}
          <div className={`${selectedUser ? "hidden" : "block"} md:block w-full md:w-1/3 md:shrink-0 border-r border-gray-100 overflow-y-auto`}>
            <div className="p-4 border-b font-semibold text-gray-700">
              Conversations
            </div>

            {loading ? (
              <p className="p-4 text-gray-500">Loading...</p>
            ) : conversations.length === 0 && !selectedUser ? (
              <p className="p-4 text-gray-500">No conversations yet.</p>
            ) : (
              <>
                {/* Show selected user even if no previous conversation */}
                {selectedUser &&
                  !conversations.find((c) => c.user._id === selectedUser._id) && (
                    <button
                      onClick={() => setSelectedUser(selectedUser)}
                      className="w-full text-left p-4 bg-blue-50 border-b"
                    >
                      <p className="font-medium text-gray-800">
                        {selectedUser.name}
                      </p>
                      <p className="text-sm text-gray-500">New conversation</p>
                    </button>
                  )}

                {conversations.map((conv) => (
                  <button
                    key={conv.user._id}
                    onClick={() => setSelectedUser(conv.user)}
                    className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-50 ${
                      selectedUser?._id === conv.user._id ? "bg-blue-50" : ""
                    }`}
                  >
                    <p className="font-medium text-gray-800">{conv.user.name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.lastMessage}
                    </p>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Chat Area */}
          <div className={`${selectedUser ? "flex" : "hidden md:flex"} flex-col w-full md:w-2/3 min-w-0`}>
            {selectedUser ? (
              <>
                <div className="p-3 sm:p-4 border-b flex items-center gap-3 font-semibold text-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setMessages([]);
                    }}
                    className="md:hidden shrink-0 rounded-lg px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                    aria-label="Back to conversations"
                  >
                    ← Back
                  </button>
                  <span className="truncate">Chat with {selectedUser.name}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.sender._id === user?.id;
                    return (
                      <div
                        key={msg._id}
                        className={`flex ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            isMe
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMe ? "text-blue-100" : "text-gray-500"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-3 sm:p-4 border-t flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Messages;
