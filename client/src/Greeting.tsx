import { useQuery } from "@tanstack/react-query";
import { trpc } from "./utils/trpc";
import { io } from "socket.io-client";

export function Greeting() {
  const greeting = useQuery(trpc.greeting.queryOptions({ name: "tRPC user" }));
  const socket = io("http://localhost:2023");
  socket.on("testing", () => {
    console.log("testing");
  });

  return <div>{greeting.data?.text}</div>;
}
