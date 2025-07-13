import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createAuthenticatedTRPCClient } from "../utils/trpc";
import { useAuth } from "../auth";
import { useMemo, useState, useEffect } from "react";
import { Plus, X, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conversations")({
  component: ConversationsPage,
});

function ConversationsPage() {
  const { token, logout, user } = useAuth();
  const [showNewConversation, setShowNewConversation] = useState(false);
  const navigate = useNavigate();

  const authenticatedTrpc = useMemo(() => {
    return createAuthenticatedTRPCClient(token ?? "");
  }, [token]);

  const { data, isLoading, error } = useQuery(
    authenticatedTrpc?.getConversations.queryOptions(),
  );

  const { data: usersData, isLoading: isLoadingUsers } = useQuery(
    authenticatedTrpc?.getUsers.queryOptions(undefined, {
      enabled: showNewConversation,
    }),
  );

  const createConversationMutation = useMutation(
    authenticatedTrpc?.createConversation.mutationOptions(),
  );

  useEffect(() => {
    if (
      error &&
      (error.message === "jwt expired" || error.message === "UNAUTHORIZED")
    ) {
      logout().then(() => navigate({ to: "/login" }));
    }
  }, [error, logout, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">
          Error loading conversations: {error.message}
        </div>
      </div>
    );
  }

  const conversations = data?.conversations;
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewConversation(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-colors"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="border border-blue-500 text-blue-500 hover:bg-blue-50 rounded p-2 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="space-y-4">
          {conversations.map((conversation) => {
            const otherParticipants = conversation.participants.filter(
              (p) => p.id !== user?.id,
            );
            const lastMessage =
              conversation.messages[conversation.messages.length - 1];

            return (
              <div
                key={conversation.id}
                onClick={() => navigate({ to: `/chat/${conversation.id}` })}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {otherParticipants.map((p) => p.username).join(", ")}
                    </h3>
                  </div>
                  {lastMessage && (
                    <div className="flex-1 text-right">
                      <p className="text-sm text-gray-600 truncate">
                        {new Date(lastMessage.createdAt).toLocaleDateString(
                          [],
                          {
                            month: "short",
                            day: "numeric",
                          },
                        )}{" "}
                        {new Date(lastMessage.createdAt).toLocaleTimeString(
                          [],
                          {
                            hour: "numeric",
                            minute: "numeric",
                            hour12: false,
                          },
                        )}{" "}
                        - {lastMessage.content}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-gray-500">
          <p>No conversations found.</p>
          <p className="text-sm mt-2">
            Start a new conversation to get started!
          </p>
        </div>
      )}

      {showNewConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Start New Conversation</h2>
              <button
                onClick={() => setShowNewConversation(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {isLoadingUsers ? (
              <div className="text-center py-4">Loading users...</div>
            ) : (
              <div className="space-y-2">
                {usersData?.users?.map((user) => (
                  <button
                    key={user.id}
                    onClick={async () => {
                      try {
                        const result =
                          await createConversationMutation.mutateAsync({
                            participantId: user.id,
                          });
                        navigate({ to: `/chat/${result.conversationId}` });
                        setShowNewConversation(false);
                      } catch (error) {
                        console.error("Failed to create conversation:", error);
                      }
                    }}
                    className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium">{user.username}</div>
                  </button>
                ))}
                {(!usersData?.users || usersData.users.length === 0) && (
                  <div className="text-center text-gray-500 py-4">
                    No other users available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
