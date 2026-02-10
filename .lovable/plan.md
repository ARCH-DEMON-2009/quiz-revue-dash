
# Link Shortener Verification + Admin-Managed Shortener Link

## Overview
Replace the Google Ads system with a link shortener verification gate. After login, free users see a verification prompt (with a "Buy Premium" option). Premium users skip it entirely. The admin can change the shortener URL from the admin panel, and that change applies site-wide immediately.

## How It Works

1. After login, free (non-premium) users land on the Dashboard and see a **verification gate overlay/page**.
2. The gate has two options:
   - **"Verify to Continue (Free)"** -- starts the shortener verification flow
   - **"Buy Premium"** -- navigates to the pricing page
3. Clicking "Verify" creates a **pending** record in `access_verifications` (valid for 10 minutes).
4. User is then shown a button linking to the **admin-configured shortened URL** (stored in `system_config`).
5. The shortened URL ultimately redirects to `/verify` on your site.
6. The `/verify` page checks: pending record exists, created within 10 minutes, at least 15 seconds elapsed since initiation. If valid, grants **12-hour access**.
7. Premium users never see any of this.

## Anti-Bypass Measures
- Must click "Start Verification" first to create a DB record (no record = `/verify` does nothing)
- Minimum 15-second delay between initiation and verification completion
- Pending records expire after 10 minutes
- Each pending record is single-use
- One pending record per user at a time

## Changes

### 1. Database Migration: `access_verifications` table
```sql
CREATE TABLE access_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE access_verifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own verifications
CREATE POLICY "Users can read own verifications" ON access_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own verifications
CREATE POLICY "Users can insert own verifications" ON access_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own verifications
CREATE POLICY "Users can update own verifications" ON access_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can read all
CREATE POLICY "Admins can read all verifications" ON access_verifications
  FOR SELECT USING (is_admin());
```

### 2. Database Migration: Add shortener URL to `system_config`
```sql
INSERT INTO system_config (config_key, config_value, description)
VALUES ('shortener_link', 'https://your-shortener-link.com', 'The shortened URL users click for verification. Admin can change this.');
```

### 3. Delete All Ad Components
Remove these files:
- `src/components/ads/AdBanner.tsx`
- `src/components/ads/InlineAd.tsx`
- `src/components/ads/StickyAd.tsx`
- `src/components/ads/InterstitialAd.tsx`
- `src/components/ads/index.ts`

### 4. Remove Ad References from Pages
- **`Dashboard.tsx`**: Remove `AdBanner`, `StickyAd`, `InlineAd` imports and usage
- **`Quiz.tsx`**: Remove `InterstitialAd`, `InlineAd` imports and usage, remove `showInterstitial` state
- **`Results.tsx`**: Remove `AdBanner`, `InlineAd` imports and usage

### 5. New Component: `LinkShortenerGate.tsx`
A full-screen overlay/modal shown to free users who haven't verified in 12 hours. Contains:
- "Verify to Continue (Free)" button that calls the `generate-verification` edge function, then shows the shortened link
- "Buy Premium for Ad-Free Experience" button linking to `/pricing`
- Timer showing the initiation countdown
- Fetches the shortener URL from `system_config` table

### 6. New Page: `/verify` (`src/pages/Verify.tsx`)
- Reads current user from auth
- Checks `access_verifications` for a pending record created within 10 minutes
- Validates at least 15 seconds elapsed since `initiated_at`
- If valid: updates status to `verified`, sets `expires_at` to now + 12 hours
- Redirects to Dashboard with success toast
- If invalid: shows error message

### 7. Edge Function: `generate-verification`
- Authenticates the user
- Cancels (deletes) any existing pending verifications for the user
- Inserts a new pending record with `expires_at` = now + 10 minutes
- Returns success with `initiated_at` timestamp

### 8. Update `AccessGuard.tsx`
- Add `verified` type to `AccessStatus`
- Check `access_verifications` for a record where `status = 'verified'` AND `expires_at > now()`
- Types become: `premium`, `verified` (12hr access), `free` (needs verification)

### 9. Update `Dashboard.tsx`
- After removing ads, wrap content with `LinkShortenerGate` that shows when `accessStatus.type === 'free'`
- The gate blocks the Dashboard until verified or premium

### 10. Update `App.tsx`
- Add `/verify` route pointing to `Verify.tsx`

### 11. Admin Panel: Shortener Link Management
Add a new card in `Admin.tsx` (in the settings area near maintenance mode) with:
- An input field showing the current shortener URL (loaded from `system_config` where `config_key = 'shortener_link'`)
- A "Save" button that updates `system_config`
- This is the single source of truth -- when admin changes this URL, the `LinkShortenerGate` component fetches it dynamically

## Technical Details

### Verification Flow
```text
User logs in -> Dashboard loads
       |
  Premium? --YES--> Direct access, no gate
       |
      NO
       |
  Has verified token (status='verified', expires_at > now)? --YES--> Direct access
       |
      NO
       |
  Show LinkShortenerGate (full-screen overlay)
       |
  Option A: "Buy Premium" -> /pricing
  Option B: "Verify to Continue"
       |
  Call generate-verification edge function
       |
  Pending record created (10 min expiry)
       |
  Show button with admin-configured shortened URL
       |
  User clicks -> completes shortener flow -> lands on /verify
       |
  Check: pending exists? < 10 min old? >= 15s elapsed?
       |
  YES -> Mark verified, expires_at = now + 12hrs -> redirect to Dashboard
  NO  -> Show error
```

### Admin Shortener Link Config
```text
Admin Panel -> Settings section
  |
  Input: [https://your-shortened-link.com]  [Save]
  |
  Saves to system_config.config_value WHERE config_key = 'shortener_link'
  |
  LinkShortenerGate reads this value when rendering
```
