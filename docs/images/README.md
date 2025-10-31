# CalAIder Documentation Images

This directory contains screenshots and images used in the README files.

## Required Images

Please add the following images to this directory:

### Main README (`../../README.md`)
- [ ] `logo.png` - CalAIder logo (recommended size: 200x200px)
- [ ] `main-ui.png` - Screenshot of main popup interface (recommended size: 800x600px)
- [ ] `event-detection.png` - Screenshot showing event detection in action
- [ ] `installation.png` - Screenshot of Chrome extensions page
- [ ] `usage-flow.png` - Workflow diagram or screenshot sequence

### Frontend README (`../../frontend/README.md`)
- [ ] `extension-ui.png` - Extension interface overview
- [ ] `load-unpacked.png` - Chrome extensions page with "Load unpacked" highlighted

### Frontend/CalAIder-frontend README
- [ ] `architecture.png` - System architecture diagram
- [ ] `popup-ui.png` - Detailed popup interface screenshot
- [ ] `debug-panel.png` - Debug panel screenshot

## Image Guidelines

### Screenshots
- **Format:** PNG (for UI screenshots) or JPG (for photos)
- **Resolution:** High-DPI (2x) recommended
- **Size:** Optimize images to keep under 500KB each
- **Background:** Use actual browser chrome/extension UI when possible

### Diagrams
- **Format:** PNG or SVG (SVG preferred for diagrams)
- **Tool suggestions:** 
  - Figma (UI mockups)
  - Draw.io / Lucidchart (architecture diagrams)
  - Excalidraw (quick sketches)

### Logo
- **Format:** PNG with transparency or SVG
- **Sizes:** Provide multiple sizes (128x128, 200x200, 512x512)
- **Style:** Should match extension icon theme

## Taking Screenshots

### For Extension UI
1. Load extension in Chrome
2. Open popup by clicking extension icon
3. Use a screenshot tool (Windows: Snipping Tool, Mac: Cmd+Shift+4)
4. Capture the popup window
5. Annotate if needed (arrows, highlights)

### For Chrome Extensions Page
1. Go to `chrome://extensions`
2. Enable Developer mode
3. Load the CalAIder extension
4. Take screenshot showing:
   - Extension card
   - "Load unpacked" button
   - Developer mode toggle

### For Event Detection
1. Visit a webpage with events (e.g., eventbrite.com)
2. Open extension popup
3. Show detected events list
4. Optionally: Show before/after comparison

## Placeholder Images

While adding actual images, you can create simple placeholder images:

```bash
# Using ImageMagick (if installed)
convert -size 800x600 xc:lightgray -pointsize 72 -gravity center -annotate +0+0 "CalAIder\nScreenshot" logo.png
```

## Updating README References

After adding images, the markdown references are already in place:
```markdown
![Image Description](./docs/images/filename.png)
```

No changes needed to README files once images are added to this directory.

## Example Directory Structure

```
docs/
└── images/
    ├── logo.png
    ├── main-ui.png
    ├── event-detection.png
    ├── installation.png
    ├── usage-flow.png
    ├── extension-ui.png
    ├── load-unpacked.png
    ├── architecture.png
    ├── popup-ui.png
    └── debug-panel.png
```

## Tips

- Use consistent styling across screenshots (same browser theme, same time/date)
- Blur any personal information (email addresses, calendar events)
- Use placeholder data for sensitive information
- Consider adding annotations (arrows, highlights) to guide users
- Keep aspect ratios appropriate for web display
- Test images display correctly in GitHub markdown preview
