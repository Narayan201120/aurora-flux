# Current Objective

Milestone: M2 Cel Shading Pipeline

Create the visual identity of the game.

Requirements:

- Custom cel shading with hard lighting bands (3–4 bands, nearest-neighbor thresholds)
- Inverted-hull outlines with screen-space-consistent thickness
- Screen-space edge detection pass (normal + depth prepass + Sobel filter)
- Fresnel rim lighting on lit objects
- Hard-banded specular highlights
- Post-processing pipeline with color grading
- Anime-styled basic scene using the cel materials
- Outline + cel materials must coexist without double edges

Verification:

- bun run check-types succeeds
- bun run lint succeeds
- bun run build succeeds
- bun run dev launches without console errors
- Visual review: hard banding visible, outlines stable at distance, rim light readable on silhouettes
- No double edges between inverted-hull outlines and Sobel interior edges
