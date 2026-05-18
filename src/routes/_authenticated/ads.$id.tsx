import { createFileRoute, useParams } from "@tanstack/react-router";
import { AdEditor } from "@/components/merchant/AdEditor";

export const Route = createFileRoute("/_authenticated/ads/$id")({
  component: EditAdRoute,
});

function EditAdRoute() {
  const { id } = useParams({ from: "/_authenticated/ads/$id" });
  return <AdEditor adId={id} />;
}
