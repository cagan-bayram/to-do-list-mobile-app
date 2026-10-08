# ToDoo privacy policy

`privacy-policy.html` is a standalone page ready for static hosting. It includes its own styles and has no external scripts, fonts, tracking or cookies. It is **not hosted yet**.

The policy uses the public developer name **Çağan Arda Özkan** and contact email **cagansoftwareengineering@outlook.com**. It describes the current local-only task app, local notifications, operating-system backups and email support. Review it again before adding accounts, cloud sync, analytics, ads or billing.

## Keep the copies in sync

1. Edit `src/content/privacy-policy.json`, including its last-updated date. The in-app Privacy Policy screen reads this file.
2. Run `npm run privacy:export` to regenerate this HTML page and the root `PRIVACY_POLICY.md`.
3. Publish the updated HTML file to the same public address, and include the updated in-app policy in the next app release.

## Before submitting to Google Play

Host `privacy-policy.html` on a public HTTPS website (for example, a GitHub Pages site you control). Open the final URL without signing in and check that the policy is readable. Use that live page URL in Play Console's privacy-policy field. A local path or a repository file-view URL is not the hosted page.

Google requires an accessible public privacy-policy URL plus a policy link or text within the app. The app already has an offline policy screen linked from the bottom of its task list. See [Google Play's User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311).

The Android application ID is `com.caganardaozkan.todoo`; the displayed app name is `ToDoo`. Changing the application ID from the earlier development version creates a separate installed app with its own task storage and permissions. Once uploaded to Play, retain this ID for updates to that listing.
