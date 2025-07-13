import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { AuthContext } from "../auth";

interface RouterContext {
  auth: AuthContext;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
