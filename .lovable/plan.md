# Security Fixes and Hardening Plan

This plan addresses several security issues identified during a production audit of the codebase, focusing on identity exposure, improper RLS policies, and client-side data leaks.

## Identified Issues

1.  **Identity Exposure in TNC Global Leaderboard**: The `tnc` edge function and related frontend components were exposing raw user emails or fallback identifiers.
2.  **Legacy Identity Resolution**: Older parts of the application were still using email prefixes or raw emails for user identification in leaderboards and PDFs.
3.  **Inconsistent Admin Identity Protection**: Admins were sometimes appearing with "Premium" badges or frames instead of their exclusive Admin identity.
4.  **Client-Side Verification Bypass**: Potential for users to self-verify or bypass premium gates by manipulating client-side state.
5.  **Answer Key Leaks**: Risk of answer keys being sent to the client pre-submission.

## Implementation Details

### 1. Identity Masking & Resolution
*   **Edge Function Hardening**: Update the `tnc` edge function to strictly resolve user identities server-side using `resolveUserIdentities`. Raw emails will never be sent to the client.
*   **Universal Name Resolution**: Standardize on `maskName` and `getPdfIdentity` across all components to ensure consistent, privacy-preserving display names.

### 2. Identity Visuals (Frames & Badges)
*   **Priority Logic**: Enforce strict identity priority where `Admin` status always overrides `Premium` status for frames, badges, and text styles.
*   **Component Unification**: Use `LeaderboardIdentityAvatar.tsx` as the single source of truth for rendering user identities in all leaderboards.

### 3. Database Security (RLS)
*   **Grant Hardening**: Apply a new migration to revoke `PUBLIC` execute permissions on sensitive `SECURITY DEFINER` functions, granting access only to `service_role` and explicitly allowed authenticated users.
*   **Policy Refinement**: Ensure all `INSERT` and `UPDATE` operations on gated tables (like `premium_users` or `results`) are either scoped strictly to the authenticated `user_id` or restricted to the `service_role`.

### 4. Quiz Logic Hardening
*   **Server-Side Scoring**: Enforce server-side scoring for all TNC tests. The client will only receive questions with empty `correctAnswer` and `explanation` fields until a successful submission.
*   **Verification Gate**: Move the verification check for free access to the edge function, preventing client-side bypasses.

### 5. PDF Security
*   **Signed Permissions**: Implement `requestTncPdfPermission` which issues a short-lived token. The PDF generation component will require this token to fetch necessary identity assets (avatars, etc.).

## Verification Plan

*   **Identity Test**: Verify that no raw emails appear in the `/tnc-tests/leaderboard` DOM or network responses.
*   **Admin Priority Test**: Verify that admin users show the dual-glow frame and admin badge even if they have an active premium subscription.
*   **Scoring Integrity**: Attempt to fetch TNC test questions and verify `correctAnswer` is empty in the network response.
*   **RLS Audit**: Run a manual check to ensure `anon` users cannot execute sensitive functions like `handle_new_user`.
