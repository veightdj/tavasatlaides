import { describe, it, expect } from "vitest";
import {
  getProfileVisibility,
  resolveProfileRole,
  PARTNER_TILES,
} from "../profile-visibility";

const UID = "00000000-0000-0000-0000-000000000001";

const client = { userId: UID, roles: [], hasStore: false };
const partnerByRole = { userId: UID, roles: ["partner"], hasStore: false };
const partnerByStore = { userId: UID, roles: [], hasStore: true };
const admin = { userId: UID, roles: ["admin"], hasStore: false };
const anon = { userId: null, roles: [], hasStore: false };

describe("resolveProfileRole", () => {
  it("treats unauthenticated viewers as client", () => {
    expect(resolveProfileRole(anon)).toBe("client");
  });
  it("returns client when user has no roles and no store", () => {
    expect(resolveProfileRole(client)).toBe("client");
  });
  it("returns partner when the partner role is granted", () => {
    expect(resolveProfileRole(partnerByRole)).toBe("partner");
  });
  it("returns partner when the user owns a store but has no explicit role", () => {
    expect(resolveProfileRole(partnerByStore)).toBe("partner");
  });
  it("returns admin when the admin role is granted, even without a store", () => {
    expect(resolveProfileRole(admin)).toBe("admin");
  });
});

describe("CLIENT profile visibility", () => {
  const v = getProfileVisibility(client);

  it("does NOT render the Business section", () => {
    expect(v.sections.map((s) => s.id)).not.toContain("business");
  });
  it("renders no partner tiles", () => {
    expect(v.businessTiles).toEqual([]);
  });
  it("does NOT show the partner badge", () => {
    expect(v.showPartnerBadge).toBe(false);
  });
  it("renders Activity, Preferences, Support, Account in that order", () => {
    expect(v.sections.map((s) => s.id)).toEqual([
      "activity", "preferences", "support", "account",
    ]);
  });
  it("shows the destructive account actions when signed in", () => {
    expect(v.showAccountActions).toBe(true);
  });
});

describe("PARTNER profile visibility", () => {
  it.each([
    ["explicit role", partnerByRole],
    ["store ownership", partnerByStore],
  ])("renders the Business section first (%s)", (_label, input) => {
    const v = getProfileVisibility(input);
    expect(v.sections[0]?.id).toBe("business");
  });

  it("exposes every partner tile, in order, with /profile/* URLs only", () => {
    const v = getProfileVisibility(partnerByRole);
    expect(v.businessTiles.map((t) => t.id)).toEqual(
      PARTNER_TILES.map((t) => t.id),
    );
    for (const tile of v.businessTiles) {
      expect(tile.to.startsWith("/profile/")).toBe(true);
    }
  });

  it("shows the partner badge", () => {
    expect(getProfileVisibility(partnerByRole).showPartnerBadge).toBe(true);
  });

  it("still shows the shared Activity, Preferences, Support, Account sections", () => {
    const ids = getProfileVisibility(partnerByRole).sections.map((s) => s.id);
    expect(ids).toEqual(["business", "activity", "preferences", "support", "account"]);
  });
});

describe("ADMIN profile visibility", () => {
  const v = getProfileVisibility(admin);
  it("inherits the Business section and partner tiles", () => {
    expect(v.sections[0]?.id).toBe("business");
    expect(v.businessTiles.length).toBe(PARTNER_TILES.length);
  });
  it("shows the partner badge for admins as well", () => {
    expect(v.showPartnerBadge).toBe(true);
  });
});

describe("Role separation invariants", () => {
  it("CLIENT visibility never leaks any /profile/<partner> tile URL", () => {
    const v = getProfileVisibility(client);
    const partnerUrls = PARTNER_TILES.map((t) => t.to);
    for (const url of partnerUrls) {
      expect(v.businessTiles.some((t) => t.to === url)).toBe(false);
    }
  });

  it("CLIENT and PARTNER share the same Activity rows (no duplicated screens)", () => {
    expect(getProfileVisibility(client).activityRows)
      .toEqual(getProfileVisibility(partnerByRole).activityRows);
  });

  it("anonymous viewers never see destructive account actions", () => {
    expect(getProfileVisibility(anon).showAccountActions).toBe(false);
  });

  it("anonymous viewers see no Business tiles", () => {
    expect(getProfileVisibility(anon).businessTiles).toEqual([]);
  });
});
