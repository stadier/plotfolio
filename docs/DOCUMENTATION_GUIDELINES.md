# Documentation Guidelines

## 📁 Documentation Structure

All documentation files **MUST** be placed in the `/docs` directory to keep the repository organized.

## 📝 File Organization

### User Documentation
Place user-facing guides in `/docs`:
- Tutorials and how-to guides
- Feature documentation
- Quick start guides
- User manuals

### Developer Documentation
Place technical documentation in `/docs`:
- API documentation
- Architecture guides
- Component documentation
- Database schema
- Contributing guides

### Examples:
```
docs/
├── README.md                          # Documentation index
├── BOUNDARY_REGISTRATION_GUIDE.md     # User guide
├── QUICK_START_BOUNDARIES.md          # Quick start
├── API_REFERENCE.md                   # API docs (future)
├── ARCHITECTURE.md                    # Architecture (future)
└── CONTRIBUTING.md                    # Contribution guide (future)
```

## ✍️ Writing Documentation

### Format
- Use Markdown (`.md`) format
- Include clear headings and sections
- Add code examples where applicable
- Include visual diagrams for complex concepts

### Naming Convention
- Use UPPERCASE for main documentation files (e.g., `README.md`, `CONTRIBUTING.md`)
- Use descriptive names (e.g., `BOUNDARY_REGISTRATION_GUIDE.md`)
- Separate words with underscores or hyphens

### Content Guidelines
1. **Start with a clear title** - Use H1 (`#`) for main title
2. **Add a brief description** - Explain what the document covers
3. **Use sections** - Break content into logical sections
4. **Include examples** - Show, don't just tell
5. **Add navigation** - Link to related documentation
6. **Keep it updated** - Update docs when features change

## 🔗 Linking Documentation

When referencing documentation:
- From root: `[Guide](./docs/GUIDE.md)`
- From docs: `[Other Guide](./OTHER_GUIDE.md)`
- From src: `[Guide](../docs/GUIDE.md)`

## ✅ Checklist for New Documentation

- [ ] File is placed in `/docs` directory
- [ ] File name follows naming convention
- [ ] Added to `/docs/README.md` index
- [ ] Referenced in main `/README.md` if user-facing
- [ ] Includes clear title and description
- [ ] Has proper section structure
- [ ] Contains code examples (if applicable)
- [ ] Includes visual aids (if helpful)
- [ ] Links to related documentation

## 🚫 What NOT to Put in Docs

- Configuration files (use root directory or `.github`)
- Source code (use `/src`)
- Assets/images (use `/public` or `/docs/assets`)
- Temporary notes (use project management tools)

## 📸 Images and Assets

If documentation requires images:
1. Create `/docs/assets` folder
2. Organize by documentation file
3. Reference with relative paths

Example:
```markdown
![Diagram](./assets/boundary-registration/diagram.png)
```

## 🔄 Updating Documentation

When making changes:
1. Update the relevant `.md` file
2. Update "Last updated" date if present
3. Update `/docs/README.md` if structure changes
4. Commit with clear message: `docs: update boundary guide`

## 📦 Documentation Deployment

- Documentation is version-controlled with code
- Hosted on GitHub repository
- Can be deployed to docs platforms if needed
- Keep in sync with feature releases

---

**Remember**: Good documentation is as important as good code! 📚✨
