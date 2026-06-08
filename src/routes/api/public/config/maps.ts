import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/config/maps")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.MAPS ?? process.env.GOOGLE_MAPS_BROWSER_KEY ?? "";
        return Response.json(
          { key },
          {
            headers: {
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      },
    },
  },
});
