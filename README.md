# apdock

A mobile-first lifestyle dock space Progressive Web Application (PWA) built with **Angular 22** (Zoneless Signal Architecture), **Firebase Auth**, **Cloud Firestore**, and adaptive design tokens.

🌐 **Live Deployment**: [https://apdock.web.app](https://apdock.web.app)

---

## 📚 Documentation Index

All project documentation is consolidated in the [`docs/`](./docs) directory:

- 🏗️ **[System Architecture](docs/ARCHITECTURE.md)**: Full frontend and backend architecture, reactive signal state flow, Firebase Auth / Firestore schemas, atomic handle generation, PWA cache management, and security model.
- 🎨 **[UI & Component Guidelines](docs/UI_GUIDELINES.md)**: Luxury minimalist design system, 4-quadrant color palette tokens, typography scale, component specs (Header, Popover, Minimal Modal, Cards), spring physics, and accessibility standards.
- 📖 **[CLI & Development Reference](docs/README.md)**: Original Angular CLI development, testing, and building commands.

---

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start local dev server (http://localhost:4200)
npm start

# Run unit test suite (Vitest)
npm test

# Production build
npm run build

# Deploy to Firebase Hosting
npx firebase deploy --only hosting
```
