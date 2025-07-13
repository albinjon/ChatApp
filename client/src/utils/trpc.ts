import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import type { AppRouter } from '../../../server';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ...
    },
  },
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: 'http://localhost:2022' })],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

// Function to create an authenticated tRPC client
export function createAuthenticatedTRPCClient(token: string) {
  const authenticatedClient = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: 'http://localhost:2022',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ],
  });

  return createTRPCOptionsProxy<AppRouter>({
    client: authenticatedClient,
    queryClient,
  });
}
