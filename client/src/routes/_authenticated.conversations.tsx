import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createAuthenticatedTRPCClient } from "../utils/trpc";
import { useAuth } from "../auth";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conversations")({
  component: ConversationsPage,
});

function ConversationsPage() {
  const { token } = useAuth();
  const [showNewConversation, setShowNewConversation] = useState(false);

  if (!token) {
    throw redirect({ to: "/login" });
  }

  const authenticatedTrpc = useMemo(() => {
    return createAuthenticatedTRPCClient(token);
  }, [token]);

  const { data, isLoading, error } = useQuery(
    authenticatedTrpc?.getConversations.queryOptions(),
  );

  const { data: usersData, isLoading: isLoadingUsers } = useQuery(
    authenticatedTrpc?.getUsers.queryOptions(undefined, {
      enabled: showNewConversation,
    }),
  );

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
        <button
          onClick={() => setShowNewConversation(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">
                    Conversation {conversation.id}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Participants:{" "}
                    {conversation.participants
                      .map((p) => p.username)
                      .join(", ")}
                  </p>
                  {conversation.messages.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Last message:{" "}
                      {
                        conversation.messages[conversation.messages.length - 1]
                          .content
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
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
                    onClick={() => {
                      console.log("Start conversation with user:", user);
                      setShowNewConversation(false);
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
