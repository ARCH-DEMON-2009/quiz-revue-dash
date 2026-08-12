# Implementation Plan - Identity Visuals & Error Entertainment

## Problem Statement
The user wants to finalize the identity visual system (admin/premium priority, name masking) across all leaderboards and PDFs, and implement an entertainment error image system (waifu.im) for graceful degradation during failures.

## Proposed Changes

### 1. Identity Visuals (Consistency & Privacy)
- **Standardize Names**: Use `src/lib/displayName.ts` to ensure names are masked (no emails) across all views.
- **Unified Avatar Component**: Use `src/components/LeaderboardIdentityAvatar.tsx` in all leaderboard views (`Leaderboard.tsx`, `TncLeaderboard.tsx`, `TncGlobalLeaderboard.tsx`) to ensure Admin frames/badges correctly override premium ones.
- **PDF Fallback**: Update `src/lib/tncPdf.ts` to use a generated initials avatar if the user's profile picture fails to load.
- **Profile Preview**: Add a card to `src/pages/Profile.tsx` so users can see exactly how they appear to others.

### 2. Entertainment Error System
- **Image Service**: Finalize `src/lib/waifuImage.ts` for safe, cached, and timed-out fetching of SFW images from waifu.im.
- **Global Boundary**: Wrap the app in `src/components/AppErrorBoundary.tsx` to catch top-level crashes and show an entertaining error state.
- **404 Page**: Integrate `ErrorEntertainmentImage` into `src/pages/NotFound.tsx`.

### 3. Verification
- **Automated Tests**: Run `vitest` on `LeaderboardIdentityAvatar.test.tsx` to ensure admin priority logic is sound.
- **Manual QA**: Verify 404 page and identity masking in the preview.

## Technical Details
- **Waifu API**: `https://api.waifu.im/images?IsNsfw=False&PageSize=10`
- **Cache Duration**: 5 minutes for entertainment images.
- **Identity Logic**: Admin status checked via `get_admin_user_ids` RPC or edge function metadata.
