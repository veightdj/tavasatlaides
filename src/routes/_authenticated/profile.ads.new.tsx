import { createFileRoute } from "@tanstack/react-router";
import { AdEditor } from "@/components/merchant/AdEditor";

export const Route = createFileRoute("/_authenticated/ads/new")({
  component: () => <AdEditor />,
});
