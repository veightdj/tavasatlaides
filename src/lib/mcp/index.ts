import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchDeals from "./tools/search-deals";
import getDeal from "./tools/get-deal";
import listCategories from "./tools/list-categories";
import listMyStores from "./tools/list-my-stores";
import listMyDeals from "./tools/list-my-deals";
import createDeal from "./tools/create-deal";
import updateDeal from "./tools/update-deal";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "tavasatlaides",
  title: "TavasAtlaides",
  version: "0.1.0",
  instructions:
    "Tools for TavasAtlaides, a Latvian local deals directory. Use `search_deals`, `get_deal` and `list_categories` to browse public deals. Partners can manage their own businesses with `list_my_stores`, `list_my_deals`, `create_deal` and `update_deal`. All access is scoped to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchDeals, getDeal, listCategories, listMyStores, listMyDeals, createDeal, updateDeal],
});
