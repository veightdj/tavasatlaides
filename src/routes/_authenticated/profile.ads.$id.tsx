import { createFileRoute, useParams } from "@tanstack/react-router";
import { AdEditor } from "@/components/merchant/AdEditor";

export const Route = createFileRoute("/_authenticated/profile/ads/$id")({
  component: EditAdRoute,
});

function EditAdRoute() {
  const { id } = useParams({ from: "/_authenticated/profile/ads/$id" });
  return <AdEditor adId={id} />;
}
