# Documentation Viewer - Quick Start Guide

## For End Users

### Accessing the Documentation
1. Log in to the Event Manager application
2. Click on **"Documentation"** in the main navigation menu (book icon)
3. Browse documentation files in the left sidebar
4. Click on any document to view it

### Searching Documentation
1. Click the **Search** button in the header (or press `⌘K` / `Ctrl+K`)
2. Type your search query
3. Use arrow keys to navigate results
4. Press Enter to open a document

### Keyboard Shortcuts
- `⌘K` / `Ctrl+K`: Open search
- `⌘P` / `Ctrl+P`: Print current document
- `⌘B` / `Ctrl+B`: Toggle sidebar
- `Escape`: Close search modal

### Other Features
- **Print**: Click the printer icon to print the current document
- **Download**: Click the download icon to save the markdown file
- **Table of Contents**: Automatically generated on the right side (desktop only)
- **Breadcrumbs**: Navigate back through the document hierarchy
- **Dark Mode**: Automatically follows your theme preference

## For Administrators

### Backend Requirements

The frontend expects these API endpoints to be available:

```
GET  /api/docs                    - List all documentation files
GET  /api/docs/:path              - Get specific document content
GET  /api/docs/search?q=query     - Search documentation
GET  /api/docs/category/:id       - Get docs by category (optional)
```

### Expected Response Formats

**GET /api/docs** - List files:
```json
{
  "data": [
    {
      "name": "Getting Started",
      "path": "getting-started",
      "type": "directory",
      "children": [
        {
          "name": "README.md",
          "path": "getting-started/README.md",
          "type": "file"
        }
      ]
    },
    {
      "name": "README.md",
      "path": "README.md",
      "type": "file"
    }
  ]
}
```

**GET /api/docs/:path** - Get document:
```json
{
  "data": {
    "content": "# Markdown content here...",
    "path": "getting-started/README.md"
  }
}
```

**GET /api/docs/search** - Search results:
```json
{
  "data": [
    {
      "path": "getting-started/README.md",
      "title": "Getting Started",
      "excerpt": "This guide will help you get started...",
      "matches": 3
    }
  ]
}
```

### File Organization

Place documentation files in the backend's designated docs directory. The system supports:

- **Markdown files** (.md)
- **Nested folders** for organization
- **README.md** as default for each folder
- **Any folder depth** for complex structures

### Example Folder Structure
```
docs/
├── README.md                    # Root documentation
├── getting-started/
│   ├── README.md
│   ├── installation.md
│   └── configuration.md
├── user-guide/
│   ├── README.md
│   ├── events.md
│   ├── contests.md
│   └── scoring.md
├── admin-guide/
│   ├── README.md
│   ├── user-management.md
│   └── settings.md
└── api/
    ├── README.md
    └── endpoints.md
```

## For Developers

### Components Overview

```
DocsViewerPage.tsx          # Main page component
├── DocsNavigation.tsx      # Left sidebar file tree
├── DocsContent.tsx         # Markdown renderer with TOC
├── DocsBreadcrumb.tsx      # Breadcrumb navigation
└── DocsSearchModal.tsx     # Search interface
```

### Adding to Your Application

The documentation viewer is already integrated. If you need to customize:

1. **Modify Styling**: Edit `/frontend/src/index.css` (search for "Documentation Viewer")
2. **Change Navigation**: Edit `/frontend/src/constants/navigationItems.tsx`
3. **Customize Markdown**: Edit `/frontend/src/components/DocsContent.tsx`
4. **Add Features**: Extend `/frontend/src/pages/DocsViewerPage.tsx`

### API Integration

Use the `docsAPI` service from `/frontend/src/services/api.ts`:

```typescript
import { docsAPI } from '../services/api'

// Get all docs
const docs = await docsAPI.getAll()

// Get specific doc
const doc = await docsAPI.getDoc('path/to/file.md')

// Search docs
const results = await docsAPI.search('query')
```

### Customizing Markdown Rendering

Edit component renderers in `DocsContent.tsx`:

```typescript
const components = {
  h1: ({ children, ...props }: any) => {
    // Custom h1 rendering
  },
  code: ({ children, ...props }: any) => {
    // Custom code block rendering
  },
  // ... other components
}
```

### Adding New Features

1. Create feature in appropriate component
2. Add API endpoint if needed in `api.ts`
3. Update TypeScript types
4. Test thoroughly
5. Document the feature

## Troubleshooting

### Common Issues

**Documents not loading:**
- Verify backend API endpoints are accessible
- Check browser console for errors
- Ensure authentication is working

**Search not working:**
- Verify `/api/docs/search` endpoint is implemented
- Check query parameter format
- Ensure documents are indexed on backend

**Styling issues:**
- Clear browser cache
- Check if custom CSS is conflicting
- Verify dark mode is working correctly

**Mobile issues:**
- Test on actual devices, not just browser emulation
- Check touch event handling
- Verify responsive breakpoints

### Getting Help

1. Check browser console for errors
2. Review backend logs for API issues
3. Verify all dependencies are installed
4. Ensure TypeScript compilation succeeds
5. Test with different browsers

## Best Practices

### For Content Writers

1. **Use Markdown Headers** - Proper heading hierarchy (h1, h2, h3)
2. **Add Code Blocks** - Specify language for syntax highlighting
3. **Link Documents** - Use relative paths for internal links
4. **Include Images** - Use descriptive alt text
5. **Structure Content** - Break into logical sections
6. **Test Readability** - Preview in both light and dark modes

### For Administrators

1. **Organize Files** - Use logical folder structure
2. **Name Files** - Use descriptive, URL-friendly names
3. **Provide Index** - Include README.md in each folder
4. **Keep Updated** - Review and update documentation regularly
5. **Monitor Usage** - Check for broken links and missing files

## Support

For issues or questions:
1. Check this documentation
2. Review the implementation guide
3. Contact your system administrator
4. Check backend logs for API issues

---

**Version:** 1.0.0
**Last Updated:** November 14, 2025
**Status:** Production Ready ✅
