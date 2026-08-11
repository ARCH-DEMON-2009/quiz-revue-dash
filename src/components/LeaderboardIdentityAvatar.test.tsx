import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LeaderboardIdentityAvatar, {
  identityNameClass,
  resolveIdentityArt,
} from "@/components/LeaderboardIdentityAvatar";
import { displayInitial, toDisplayName } from "@/lib/displayName";

describe("display name masking", () => {
  it("never renders an email address", () => {
    expect(toDisplayName("student@example.com")).not.toContain("@");
    expect(toDisplayName("student@example.com")).not.toContain("example.com");
  });

  it("falls back to a clean display name when the name is missing", () => {
    expect(toDisplayName(null)).toBeTruthy();
    expect(toDisplayName("")).toBeTruthy();
    expect(toDisplayName(undefined)).not.toContain("@");
  });

  it("always produces an initial", () => {
    expect(displayInitial(null)).toMatch(/^[A-Z]$/);
    expect(displayInitial("aman@mail.com")).toMatch(/^[A-Z]$/);
  });
});

describe("identity art resolution", () => {
  it("gives admins the admin frame and badge, never premium art", () => {
    const art = resolveIdentityArt({ isAdmin: true, isPremium: true, adminFrame: "f1", adminBadge: "b2" });
    expect(art.tier).toBe("admin");
    expect(art.frameUrl).toBe("/frames/f1.png");
    expect(art.badgeUrl).toBe("/badges/b2.png");
  });

  it("falls back to admin defaults for unknown config values", () => {
    const art = resolveIdentityArt({ isAdmin: true, adminFrame: "nope", adminBadge: "nope" });
    expect(art.frameUrl).toBe("/frames/f3.png");
    expect(art.badgeUrl).toBe("/badges/b3.png");
  });

  it("uses premium art only for non-admin premium users", () => {
    const art = resolveIdentityArt({ isPremium: true });
    expect(art.tier).toBe("premium");
    expect(art.badgeUrl).toBe("/badges/b1.png");
  });

  it("gives free users no frame or badge", () => {
    expect(resolveIdentityArt({}).frameUrl).toBeNull();
    expect(resolveIdentityArt({}).badgeUrl).toBeNull();
  });

  it("styles admin names differently from premium names", () => {
    expect(identityNameClass({ isAdmin: true })).not.toBe(identityNameClass({ isPremium: true }));
  });
});

describe("leaderboard identity card", () => {
  it("shows the admin badge/frame for an admin who is also premium", () => {
    render(
      <LeaderboardIdentityAvatar
        name="admin@site.com"
        isAdmin
        isPremium
        adminFrame="f2"
        adminBadge="b2"
      />,
    );
    expect(screen.getByTestId("identity-frame")).toHaveAttribute("src", "/frames/f2.png");
    expect(screen.getByTestId("identity-badge")).toHaveAttribute("src", "/badges/b2.png");
    expect(screen.getByAltText("Admin Badge")).toBeInTheDocument();
  });

  it("does not leak the email into alt text / labels", () => {
    const { container } = render(<LeaderboardIdentityAvatar name="secret@mail.com" isPremium />);
    expect(container.innerHTML).not.toContain("secret@mail.com");
  });
});
