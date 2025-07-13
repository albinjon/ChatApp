import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth";
import { Send, ArrowLeft } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { queryClient, createAuthenticatedTRPCClient } from "../utils/trpc";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  component: ChatPage,
  loader: ({ params, context }) => {
    if (!context.auth.token) {
      throw new Error("No authentication token available");
    }
    const authenticatedTrpc = createAuthenticatedTRPCClient(context.auth.token);
    return queryClient.ensureQueryData(
      authenticatedTrpc.getConversation.queryOptions({
        conversationId: params.conversationId,
      }),
    );
  },
});

interface Message {
  id: number;
  content: string;
  conversationId: number;
  authorId: number;
  createdAt: string;
}

function ChatPage() {
  const { conversationId } = Route.useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const authenticatedTrpc = createAuthenticatedTRPCClient(token!);
  const { data } = useSuspenseQuery(
    authenticatedTrpc.getConversation.queryOptions({
      conversationId,
    }),
  );
  const fullConversation = data?.conversation?.messages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!token || !user) return;

    const socket = io("http://localhost:2023", {
      auth: {
        token,
      },
    });
    fullConversation && setMessages(fullConversation);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    socket.on(
      `conversation:${conversationId}:message`,
      (messageData: Message) => {
        setMessages((prev) => [...prev, messageData]);
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [token, user, conversationId]);

  const sendMessage = () => {
    if (!message.trim() || !socketRef.current || !isConnected) return;

    const messageData = {
      conversationId,
      content: message.trim(),
    };

    socketRef.current.emit("sendMessage", messageData);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/conversations" })}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold">
            Conversation {conversationId}
          </h1>
          <div className="text-sm text-gray-500">
            {isConnected ? "Connected" : "Connecting..."}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.authorId === user?.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.authorId === user?.id
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-200"
              }`}
            >
              <div className="text-sm">{msg.content}</div>
              <div
                className={`text-xs mt-1 ${
                  msg.authorId === user?.id ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {new Date(msg.createdAt).toLocaleString([], {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: false,
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !message.trim()}
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
