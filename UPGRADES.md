# TruthVote Frontend Upgrades — Roadmap & Best Practices

Goal: Move the UI toward a clean, professional prediction-market look (inspired by Kalshi) and add image support for predictions. Prioritize clarity, trust, and performance.

## Priorities (High → Low)

1. Theme: Light background, neutral cards, professional accent color
2. Image support: Upload, preview, optimization, CDN cache
3. Prediction UI: Clear odds/percentages, time-to-close, category badges
4. Accessibility & Responsiveness: Keyboard nav, ARIA labels, mobile-first
5. Performance & SEO: Image optimization, meta tags, SSR where needed
6. Observability & Testing: Sentry, unit tests, E2E tests

---

## Design & Theming

- Switch to a light background: `#FFFFFF` with `#111827` text for readability.
- Cards should be white with subtle borders and soft shadows.
- Primary action color: a professional blue `#0B79D0` (used for CTAs and links).
- Keep the green (`#059669`) and red (`#DC2626`) for yes/no visual affordances.
- Use consistent spacing, rounded corners (8-12px), and 16px baseline grid.

Files to update:
- `src/app/globals.css` — CSS variables and base styles
- Component tokens (buttons, badges, cards) to use the CSS variables

---

## Image Support (Prediction Image)

Objectives:
- Allow creators to attach an optional image to a prediction.
- Compress client-side before upload to save bandwidth and storage.
- Serve optimized versions (size/quality query params) and cache via CDN.

Implementation details:
1. Client-side compression: use Canvas API to resize to max 1920px and quality 0.8.
2. Upload to Firebase Storage under `polls/<predictionId>/<filename>`.
3. Store `imageUrl` in the `predictions` Firestore document.
4. Provide a preview before submission and ability to remove image.
5. Use an `OptimizedImage` component to add `w`, `h`, and `q` query params.
6. Set `Cache-Control` on upload to `public, max-age=31536000, immutable`.

Files to add/modify:
- `src/app/create/page.tsx` — add file input, preview, and upload flow
- `src/lib/firebase/storage.ts` — upload helpers + compression
- `src/components/OptimizedImage.tsx` — display optimized images

Security & Validation:
- Allow only image MIME types: jpg/jpeg, png, webp, gif
- Max file size: 5MB
- Scan filenames; sanitize and timestamp to avoid collisions
- Enforce `storage.rules` to require authenticated uploads for user-owned paths

---

## Prediction Card UI Enhancements

- Add image area at the top of `PollCard` when `imageUrl` exists.
- Show vote distribution visually (progress bar) and numerically (percentages).
- Add a small label: `Ends in Xh Ym` with precise countdown.
- Show `category` badge and `creator` attribution.

Files to update:
- `src/components/PollCard.tsx`

---

## Admin & Resolution UX

- Admin panel: provide image preview for pending predictions.
- Allow admins to approve/reject and edit image or replace it.

---

## Accessibility & Internationalization

- Ensure all form inputs have associated labels and accessible error states.
- Use `aria-live` regions for success/error messages.
- Provide localized date/time formatting (user timezone) where possible.

---

## Performance & SEO

- Use Next.js meta tags and Open Graph tags for shared prediction URLs.
- Generate `og:image` using the uploaded image if present (or a dynamic fallback image).
- Use `link rel=preload` for hero images where appropriate.
- Measure with Lighthouse; aim for 90+ performance first page load.

---

## Observability & Quality

- Integrate Sentry for error tracking.
- Add unit tests for upload/compression logic (Jest + jsdom) and components (React Testing Library).
- Add an E2E test (Playwright) for creating a prediction with image upload.

---

## Analytics & Monitoring

- Track events: `prediction_created`, `image_uploaded`, `prediction_approved`, `vote_cast`.
- Use Firebase Analytics and optionally Segment for upstream integrations.

---

## Suggested Implementation Timeline (2–3 week sprint)

Week 1:
- Theme update and core component restyles
- Image upload flow (client-side compression + storage)
- Update create form with preview

Week 2:
- PollCard image display and UI polish
- Add Open Graph meta support
- Add basic tests and Sentry

Week 3:
- Accessibility fixes, performance tuning, E2E tests
- Deployment checklist and rollout

---

## Final Notes & Recommendations

- Keep Firebase for auth, firestore, and storage as currently planned.
- Keep the frontend single source of truth and track progress in `UPGRADES.md`.
- When ready to move to Vercel or add an API layer, do it after stabilizing the UX.

If you want, I can now:
- Implement the `PollCard` image UI and preview display
- Add admin image management pages
- Add tests and Sentry setup

Tell me which of the above to implement next.