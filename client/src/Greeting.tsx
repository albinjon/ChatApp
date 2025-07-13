import { useQuery } from "@tanstack/react-query";
import { trpc } from "./utils/trpc";

export function Greeting() {
  const greeting = useQuery(trpc.getUsers.queryOptions({ id: 1 }));

  if (greeting.isLoading) return <div>Loading...</div>;
  if (greeting.error) return <div>Error: {greeting.error.message}</div>;

  return (
    <ul>
      {greeting.data?.users?.map((user) => (
        <li key={user.id}>{user.username}</li>
      ))}
    </ul>
  );
}
