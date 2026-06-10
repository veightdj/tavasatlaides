import { createFileRoute, redirect } from "@tanstack/react-router";

// Safety alias: any link/email pointing at /partner lands on the unified profile hub.
export const Route = createFileRoute("/partner")({
  beforeLoad: () => {
    throw redirect({ to: "/profile" });
  },
});
