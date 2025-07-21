# Chat App By Albin

This application is built from the foundation of a [minimal TRPC example repo](https://github.com/trpc/examples-minimal-react/tree/main), the core technologies being TRPC, socket.io, prisma and react.

## Setting up

```bash
cd ChatApp
docker compose up -d
cd server
npx prisma migrate deploy
cd ..
npm i
npm run dev
```

## Usage

The usernames for the application can be found in the prisma migration, but for ease-of-use, here they are: albin, sigge, jacob, zino. The password is the name, but with a "123" at the end, without any punctuation or spacing.

Start the server and bring up two browser windows, logging into separate accounts, and try starting a conversation with the other user. You'll have to refresh the page to get the conversation, in the list of chats, but after that it's all real-time updated in the chat.

## Further steps

One of the things I wasn't so happy with in this application is the handling of the authentication context, in relation to the queryClient. This should have been a global thing, but right now the authenticated queryClient needs to be setup in several places, but with the time given I can't improve it further. There's also a lot of things to be wished for in terms of error boundaries, and error handling in general, which is just not done in a very neat way right now. Another thing is that the react pages could be better split up into components, which could allow for minimizing things rerendered when state changes.

I would like to explore the subscriptions of TRPC further, and see how good they are. The major upside of socket.io is that it's more than just websockets, instead seing the connection as the abstract entity over WS, SSE and long-polling, and with really good reconnection.

To be honest, this is the first time for me using TRPC, I've only used REST API:s previously, but I definitely see the power of this. Especially with the zod schemas!

With the current setup, it would be trivial to add group chats, however, adding multiple messaging formats would take a little more work. It would be nice to have the conversation list also be in a websocket.

And, obviously, checking in the .env (with secrets) to git is a major sin, but it's just in order to make this handover smoother.