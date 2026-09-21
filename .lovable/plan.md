# Add New Profile Avatars

## Changes
- Add the eight new, unique Pinterest images to the existing premium avatar collection; the first supplied JPG is already available and will not be duplicated.
- Include all three GIFs as animated avatar choices so they animate in the profile selector and wherever the saved profile avatar is displayed.
- Store local project asset pointers for the new media instead of relying on Pinterest links, preventing external-link failures.
- Keep the current access rules: free users can preview these avatars but only premium users can select them.
- Preserve the existing mobile-friendly avatar grid and fallback behavior.

## Verification
- Confirm every new JPG and GIF appears in the selector.
- Confirm premium locking still works for free users.
- Confirm a selected GIF remains animated in the profile and leaderboard avatar.
- Check the project build and profile layout on desktop and mobile.

## Technical Details
- Download the eight unique supplied files, upload them through the project asset flow, and reference their generated asset pointers from the profile avatar list.
- Keep the existing Pinterest host support for previously saved avatars and PDF generation. Animated GIFs used in generated PDFs will render as a static frame because PDF documents cannot preserve animation.
