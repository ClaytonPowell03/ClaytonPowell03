# SCAD Studio — TODO / Handoff for Future AI

This file lists remaining work that was not completed in the initial build.
The core structure, design system, landing page (with GSAP/Three.js/tsparticles),
and rendering page (CodeMirror + Three.js + SCAD parser) are functional.

---

## 🔴 High Priority

### SCAD Parser Enhancements
- [x] Add `difference()` and `intersection()` CSG support (uses `three-csg-ts`)
- [ ] Add `hull()` and `minkowski()` operations
- [x] Add `linear_extrude()` / `rotate_extrude()` geometry generation
- [x] Support SCAD variables (e.g. `r = 5; sphere(r=r);`)
- [x] Support `for` loops and `if` statements
- [ ] Support `module` definitions and calls
- [ ] Support `import()` for STL files

### Export
- [x] Add STL export (download button)
- [ ] Add OBJ export option
- [x] Add screenshot/PNG export of the 3D viewport

---

## 🟡 Medium Priority

### Editor
- [ ] Build a proper SCAD language mode for CodeMirror (syntax highlighting for SCAD keywords, not JS)
- [ ] Add auto-completion for SCAD functions (`cube`, `sphere`, `translate`, etc.)
- [ ] Add inline error highlighting when parse fails
- [x] Add a console/log panel (the tab exists and works)
- [x] File save/load (localStorage + file system access API)

### 3D Preview
- [x] Add bloom/glow post-processing (uses `EffectComposer` + `UnrealBloomPass`)
- [ ] Add environment map / HDRI background option
- [ ] Add measurement/ruler tool
- [ ] Add section/clipping plane view
- [ ] Improve shadow quality and add ambient occlusion (SSAO)

### UI Polish
- [x] Make the landing page fully responsive (test mobile breakpoints)
- [x] Add loading spinner/skeleton on initial page load
- [ ] Add dark/light theme toggle
- [x] Add keyboard shortcut help modal (? key)
- [x] Animate page transitions between landing and editor

---

## 🟢 Low Priority / Nice-to-Have

### Features
- [ ] Settings panel (grid size, background color, lighting presets)
- [x] Model library / templates sidebar
- [ ] Share model via URL (encode SCAD in URL hash)
- [ ] Undo/redo for the 3D viewport state
- [ ] Multi-file/tab support in the editor
- [ ] Collaborative editing (WebRTC or WebSocket)

### Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Keyboard navigation for the toolbar and view controls
- [ ] Screen reader announcements for render status
- [x] Add `prefers-reduced-motion` media query support

### Performance
- [ ] Web Worker for SCAD parsing (offload from main thread)
- [ ] Incremental parsing (only re-parse changed portions)
- [ ] LOD (level of detail) for complex models
- [ ] Instanced rendering for repeated geometry

### Deployment
- [ ] Add PWA manifest + service worker for offline support
- [ ] Configure production build optimizations
- [ ] Add analytics / error tracking
- [ ] Set up CI/CD pipeline

---

## Tech Debt
- [ ] The SCAD parser uses JavaScript's highlighting in CodeMirror as a placeholder; a proper SCAD grammar should be written
- [ ] The axes HUD canvas updates on every frame; consider only updating when camera moves
- [x] The `color()` transform now supports both `[r,g,b]` arrays and named CSS colors
- [ ] Three.js coordinate mapping (SCAD Y→Three Z) should be more consistently handled
