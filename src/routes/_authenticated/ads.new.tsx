import { createFileRoute } from "@tanstack/react-router";
import { Route as EditorRoute } from "./ads.$id";

// Reuse the editor route component; "new" sentinel triggers create-mode.
export const Route = createFileRoute("/_authenticated/ads/new")({
  component: EditorRoute.options.component!,
  beforeLoad: () => ({ id: "new" }),
});
