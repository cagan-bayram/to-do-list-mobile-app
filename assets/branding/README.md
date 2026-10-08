# ToDoo branding

The app uses a forest-green background, an ivory open ring and a mint checkmark.

| File | Size | Purpose |
| --- | --- | --- |
| `todoo-icon.png` | 1024 × 1024 | Opaque app icon and web favicon |
| `todoo-play-store.png` | 512 × 512 | Google Play listing icon, RGBA PNG under 1 MB |
| `todoo-foreground.png` | 432 × 432 | Transparent Android adaptive/themed icon foreground and splash mark |
| `todoo-feature-graphic.png` | 1024 × 500 | Google Play feature graphic, opaque RGB PNG |
| `source/todoo-icon.png` | Original generated size | Full-colour master |
| `source/todoo-foreground.png` | Original generated size | Transparent master |
| `source/todoo-feature-graphic.png` | Original generated size | Feature graphic master |

The foreground includes intentional transparent padding for Android masks. Android uses its alpha shape for the monochrome themed icon. Background colour is configured in `app.json` as `#245b45`.

Run `npm run branding:export` to recreate platform sizes from the masters using Expo's installed image utilities. This only resizes and encodes the selected artwork. A new native build is needed to see launcher icon and splash changes on a phone.

## Generation record

Created with the **built-in image-generation tool**, followed by a transparent-background edit. No CLI image-generation fallback was used. The selected originals are preserved in `source/`.

### Full-colour icon prompt

```text
Use case: logo-brand. Create one finished Android/iOS app icon for ToDoo, a calm, simple to-do list app. Output a square 1024 x 1024 PNG icon asset, not a mockup or presentation. Full-bleed solid deep forest green background #245B45, opaque edge to edge, with NO rounded outer corners and no outer padding/border. Center one distinctive bold geometric completion symbol: a warm ivory #F6F7F2 open circular ring (suggesting the letter O in ToDoo), with a confident rounded mint-green #B9E7C4 checkmark flowing through its open upper-right section. Flat vector-like shapes, very clean precise edges, consistent generous stroke weights and softly rounded stroke ends. The mark should be optically balanced, instantly readable at 48 px, and entirely inside the central 58 percent of the square so circular Android masks cannot crop it. Calm premium productivity design, simple high contrast silhouette. No text, no letters, no words, no tiny details, no gradients, no shadow, no 3D, no texture, no watermark. One icon only.
```

### Selected foreground edit prompt

Edit target: the full-colour icon above. Transparent background enabled.

```text
Create the FINAL Android adaptive foreground layer from this exact logo. Keep the ivory circular arc and mint-green checkmark design, but remove the entire green background to genuine alpha transparency, and reduce the symbol to about 70% of its current size while keeping it centered on an otherwise empty square canvas. The COMPLETE symbol including the upper-right check tip must lie inside an imaginary centered CIRCLE whose diameter is 52% of the entire canvas. The extra transparent padding is intentional and mandatory for Android adaptive icon masking. IMPORTANT: rebuild the silhouette with exceptionally smooth clean anti-aliased vector-like edges. Solid opaque ivory and mint fill. NO rough edges, NO white fringe, NO speckles or detached pixels, NO leftover green pixels, NO noise or texture. Transparent pixels everywhere outside the two clean shapes and throughout the ring interior. Preserve proportions and relative positions of the ring and check. One square PNG with true transparency, no mockup, no words, no visible circle guide.
```

The tool's returned dimensions differed from the requested dimensions. Platform exports use the sizes in the table above.

### Feature graphic prompt

Built-in image generation with the full-colour app icon as a palette reference. Opaque background. The task cards are promotional illustrations, not app screenshots.

```text
Use case: ads-marketing. Create a finished Google Play feature graphic for ToDoo, a calm personal to-do list app. This is a NEW wide landscape banner, 1024 x 500 target aspect ratio (approximately 2.048:1), not an app screenshot. The attached icon is a reference for colour and personality only; do not duplicate it as a large icon on the banner. Use a full-bleed deep forest-green #245B45 background with very subtle soft tonal variation, warm ivory #F6F7F2 and mint #B9E7C4. Clean, polished, restrained editorial composition with generous breathing room. Left half: large beautifully typeset warm ivory sans-serif app name exactly "ToDoo"; beneath it on two lines the exact text "One thing" and "at a time." in a smaller elegant sans-serif. Right half: a tasteful flat illustration of three gently overlapping rounded task cards, angled only slightly, with simple check circles and short abstract lines; one completed mint check and small green, amber and muted red priority dots. These are abstract task-card illustrations, not a fake phone screenshot. Keep all text and important shapes within the central 80% of width and central 72% of height. No phone/device frame, no Google Play badge, no pricing, no rankings, no review stars, no claims, no extra text, no watermark, no photographic objects. Opaque rectangular artwork with square outer corners. One banner only.
```
