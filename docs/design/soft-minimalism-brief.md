# Brief thiết kế Soft Minimalism (người dùng cung cấp, nguyên văn)

Cách áp vào dự án: xem ticket `.scratch/job-portal/issues/50-soft-minimalism-redesign.md`.

# Summary

Design a calm, human, mobile-first landing page for a job search platform called [BRAND NAME]. The UI should feel like a quiet, well-lit room rather than a busy job board: generous whitespace, pill-shaped controls, soft floating color blobs, a subtle paper grain, and one sharp cyan accent. Job hunting is stressful — the interface should lower the pulse, not raise it.

# Style

"Soft Minimalism" with a clean white base. Typography pairs the rounded geometric sans 'Outfit' with the handwritten 'Reenie Beanie' for one expressive word per headline. Depth comes from large blurred background blobs and a persistent 35% opacity SVG grain overlay; containers stay white with very soft shadows.

## Spec

- **Color palette**:
  - Background: #FFFFFF everywhere (no cream or tinted section backgrounds)
  - Accent: Cyan #06B6D4 (buttons, logo, dots, highlights)
  - Deep cyan: #0E7490 (any cyan TEXT, handwritten accent words and hover text, for readable contrast on white)
  - Blob tints: light cyan #CFFAFE, lavender #E6E6FA, sage #E8EFE8, soft lilac #EFEDF4
  - Dark stone: #292524 (secondary dark buttons, icon tiles, device frames)
  - Hairline borders: #E7E5E4 / #F5F5F4
- **Text colors**:
  - Headings: #0B0F19
  - Body: #111827
  - Secondary text: #4B5563
  - Captions and meta: #6B7280
- **Typography**:
  - Outfit throughout, sentence case only.
  - H1: 76px, weight 600, line-height 1.0, letter-spacing -0.035em.
  - H2: 48–56px, weight 600, line-height 1.05, letter-spacing -0.03em.
  - Body: 17–18px, line-height 1.65.
  - Every section gets an eyebrow label above the H2: 13px, weight 600, uppercase, letter-spacing 0.08em, #6B7280.
  - Reenie Beanie for 1 emphasized word per hero/CTA headline: 1.2–1.3em size, #0E7490, rotated -3deg.
- **Shape**:
  - Nav, buttons, search bars, inputs and chips: fully rounded pills (999px).
  - Cards: 24px–2rem radius.
  - Large sections: 4rem top radius.
  - Accordions: 16px radius.
  - Icon tiles: 1.5rem radius.
- **Shadows**:
  - Default: 0 4px 20px -2px rgba(0,0,0,0.05).
  - Card hover: lift translateY(-4px), shadow 0 12px 30px -8px rgba(0,0,0,0.08).
- **Effects**:
  - Fixed full-viewport grain overlay: feTurbulence fractalNoise, baseFrequency 0.65, opacity 0.35, mix-blend-mode overlay, pointer-events none, z-index 50.
  - Background blobs: 400–520px circles, blur 90–110px, opacity 0.35–0.6.
- **Motion**:
  - Reveal-on-scroll: translateY 30px → 0, opacity 0 → 1, 0.8s.
  - Blobs float ±10px on a 6s loop.
  - Pill buttons scale to 1.05 on hover.
  - Respect prefers-reduced-motion.

# Layout & Structure

Single-column vertical flow, max content width ~1120px, 16px side gutters on mobile. Sections separated by whitespace (96–160px vertical padding), not by background color.

## Navigation
- Sticky floating pill bar, 16px from the top, max-width 760px.
- Surface: 70% white with 20px backdrop-blur, 1px #E7E5E4 border.
- Left: circular cyan logo with a white dot, plus the brand name.
- Center: links in 14px Outfit Medium, #374151 — Jobs, Companies, Salaries, For employers. Hidden on mobile.
- Right: dark stone #292524 pill CTA "Post a job".

## Hero search
- Center-aligned, over two floating blobs (#CFFAFE and #E6E6FA).
- Small pill badge above the headline, e.g. "[NUMBER] new roles this week" (use only real data).
- Headline with one handwritten word, e.g. "Find work that feels *right*".
- Sub-headline, max-width 500px.
- Pill search bar:
  - White, soft shadow, 8px inner padding.
  - Two fields: job title/keyword and location (bg #FAFAF9, pill radius).
  - Cyan #06B6D4 pill "Search" button with dark #111827 text.
  - Stacks vertically on mobile.
- Below: a row of popular-search chips (white pill, 1px #E7E5E4 border, hover border #06B6D4).

## Fresh roles — horizontal scroll
- Horizontally scrolling cards with scroll-snap and hidden scrollbar.
- Card: 288×160px, white, 24px radius, soft shadow.
- Top-left: "Posted 2h ago" in 14px #6B7280.
- Top-right: small location or remote tag.
- Bottom: job title in 20px weight 500 #111827, company name in 14px #4B5563 beneath it.
- Hover: lift and title turns #0E7490.

## Browse & filter
- Two-pane layout.
- Left (280px, stacks on top on mobile): filter panel in a white 2rem card.
  - Pill toggle chips for job type (Full-time, Part-time, Remote, Internship).
  - Salary range slider with cyan accent.
  - Experience-level radio pills.
- Right: list of job cards (white, 24px radius, soft shadow). Each card:
  - Company logo tile.
  - Title (20px, weight 600).
  - Company · location · salary meta line in #6B7280.
  - Two or three skill chips.
  - Bookmark icon button.
  - "Apply" text link in #0E7490.
- Selected filter chips:
  - Fill #06B6D4 with #111827 text.
  - Unselected: white with a hairline border.

## How it works
- Three cascading white cards (left, center raised, right offset +48px / +96px like stacked phones), each mocking one step: Search → Save → Apply.
- The center card holds a pulsing cyan "Apply" button.
- On mobile only the center card shows.

## Top companies
- Grid of white company tiles (2rem radius): logo, name, open-role count, hover lift.

## Diary-style stories
- Two-column grid (one column on mobile) of white 2rem note cards rotated ±1deg.
- Each card:
  - Small "Week 3 of searching" meta label.
  - Quote in 21px.
  - Signature: 32px hairline followed by the name in Reenie Beanie, 24px, #4B5563.
- Use placeholders for quotes and names unless real testimonials are supplied.

## FAQ
- Narrow centered column (max 680px).
- Each item: white, 16px radius, 1px #F5F5F4 border.
- Header: 24px padding, weight 500, plus icon rotating 45deg.
- Body: expands via grid-template-rows 0fr → 1fr, 500ms ease-in-out, answer text #4B5563.

## Job alert signup (conversion)
- Full-width section over three floating blobs (cyan at low opacity, sage, lilac).
- Dark stone #292524 rounded-square icon with a cyan dot at the top.
- Headline with a handwritten word, e.g. "Let the jobs come *to you*".
- Pill form: email input (bg #FAFAF9) plus dark #292524 "Get alerts" button that scales up on hover.
- On submit, swap to a white confirmation pill with a handwritten sign-off.

## Footer
- Centered, 13px #6B7280 links: About, Privacy, Contact, For employers.

# Content rules
- No invented statistics, salaries, company names or testimonials. Use clearly marked placeholders like [COMPANY], [SALARY RANGE], [NUMBER] until real data is supplied.
- Keep all text contrast at 4.5:1 or better. Never place #06B6D4 text on white; use #0E7490 instead.
- Real <button>, <input> with <label>, and <a href> elements. Visible focus rings (2px #111827, 3px offset).
