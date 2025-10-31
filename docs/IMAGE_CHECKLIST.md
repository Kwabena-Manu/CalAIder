# 📸 Image Checklist for CalAIder README

This is a quick reference for all images referenced in the README files. Add these images to complete the documentation.

## ✅ Image Checklist

### Priority 1 (Most Important)
- [ ] **logo.png** - CalAIder logo (200x200px)
  - Location: `docs/images/logo.png`
  - Used in: Main README
  - Tip: Should match extension icon design

- [ ] **main-ui.png** - Main popup interface screenshot
  - Location: `docs/images/main-ui.png`
  - Used in: Main README
  - What to show: Popup with events list, signed-in state, add to calendar button

- [ ] **popup-ui.png** - Detailed popup interface
  - Location: `docs/images/popup-ui.png`
  - Used in: CalAIder-frontend README
  - What to show: Full popup UI with all features visible

### Priority 2 (Installation & Setup)
- [ ] **installation.png** - Chrome extensions page
  - Location: `docs/images/installation.png`
  - Used in: Main README
  - What to show: chrome://extensions with "Load unpacked" highlighted

- [ ] **load-unpacked.png** - Load unpacked process
  - Location: `docs/images/load-unpacked.png`
  - Used in: Frontend README
  - What to show: File picker selecting dist/ folder

### Priority 3 (Feature Demonstrations)
- [ ] **event-detection.png** - Event detection in action
  - Location: `docs/images/event-detection.png`
  - Used in: Main README
  - What to show: Popup showing detected events from a real webpage

- [ ] **usage-flow.png** - User workflow
  - Location: `docs/images/usage-flow.png`
  - Used in: Main README
  - What to show: Step-by-step process or multiple screenshots

- [ ] **debug-panel.png** - Debug panel interface
  - Location: `docs/images/debug-panel.png`
  - Used in: CalAIder-frontend README
  - What to show: Debug panel with extraction logs

### Priority 4 (Technical Documentation)
- [ ] **architecture.png** - System architecture diagram
  - Location: `docs/images/architecture.png`
  - Used in: CalAIder-frontend README
  - What to show: Component interaction diagram (Content Script → Background → AI → Popup → Calendar)

- [ ] **extension-ui.png** - Extension interface overview
  - Location: `docs/images/extension-ui.png`
  - Used in: Frontend README
  - What to show: Overall extension UI layout

---

## 📋 Quick Screenshot Guide

### Taking Screenshots in Windows
1. Press `Win + Shift + S` for Snipping Tool
2. Select area to capture
3. Save to `docs/images/` folder
4. Rename appropriately

### Taking Screenshots in Mac
1. Press `Cmd + Shift + 4`
2. Select area to capture
3. Find screenshot on desktop
4. Move to `docs/images/` folder
5. Rename appropriately

### Recommended Tools
- **Windows:** Snipping Tool, ShareX
- **Mac:** Built-in screenshot tool, CleanShot X
- **Cross-platform:** Firefox Screenshots, Chrome extensions

---

## 🎨 Image Requirements

### Screenshots
- **Format:** PNG
- **Max size:** 500KB per image (optimize if needed)
- **Resolution:** High-DPI (2x) preferred
- **Annotations:** Use arrows/highlights to guide users

### Diagrams
- **Format:** PNG or SVG (SVG preferred)
- **Tools:** Draw.io, Lucidchart, Excalidraw, Figma
- **Style:** Clean, professional, matching brand colors

### Logo
- **Format:** PNG with transparency
- **Sizes:** 128x128, 200x200, 512x512
- **Requirements:** Should match extension icon

---

## 🖼️ Image Optimization

Before adding images, optimize them:

### Online Tools
- [TinyPNG](https://tinypng.com/) - PNG compression
- [Squoosh](https://squoosh.app/) - Universal image optimizer
- [SVGOMG](https://jakearchibald.github.io/svgomg/) - SVG optimization

### Command Line
```bash
# Using ImageMagick
magick convert input.png -quality 85 -resize 800x600 output.png

# Using pngquant
pngquant --quality=65-80 input.png -o output.png
```

---

## 📝 What to Include in Screenshots

### main-ui.png (Main popup interface)
- ✅ Extension signed in
- ✅ 2-3 detected events visible
- ✅ "Add to Calendar" button
- ✅ User profile info
- ✅ Clear, readable text

### event-detection.png (Detection in action)
- ✅ Real webpage in background (blurred if needed)
- ✅ Popup showing extracted events
- ✅ Event details visible (name, date, time, location)
- ✅ Shows before/after or side-by-side comparison

### installation.png (Chrome extensions page)
- ✅ chrome://extensions URL visible
- ✅ Developer mode toggle highlighted
- ✅ "Load unpacked" button highlighted
- ✅ CalAIder extension visible (if already loaded)

### architecture.png (System diagram)
- ✅ All components: Content Script, Background Worker, Popup, AI Model, Calendar API
- ✅ Data flow arrows
- ✅ Labels and descriptions
- ✅ Color-coded components (optional)

### debug-panel.png (Debug tools)
- ✅ Debug panel open
- ✅ Extraction logs visible
- ✅ Model status displayed
- ✅ Storage data shown

---

## 🚀 After Adding Images

Once images are added to `docs/images/`:

1. ✅ Verify all paths are correct
2. ✅ Check images display in GitHub preview
3. ✅ Test on both light and dark mode (if applicable)
4. ✅ Commit images with descriptive commit message:
   ```bash
   git add docs/images/
   git commit -m "Add documentation images and screenshots"
   ```

---

## 💡 Pro Tips

- Use consistent browser theme across all screenshots
- Blur personal information (emails, calendar events)
- Use placeholder or demo data
- Take screenshots at standard resolution (1920x1080 or 1440x900)
- Add subtle drop shadows to make UI elements pop
- Use annotation tools to highlight important areas
- Keep file sizes under 500KB for fast page loads

---

## 🔗 Markdown Reference Format

Images are already referenced in READMEs with this format:
```markdown
![Alt text](./docs/images/filename.png)
```

or for relative paths:
```markdown
![Alt text](../../docs/images/filename.png)
```

Just add the image files - no README updates needed! 🎉
