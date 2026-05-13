# Buddika Stores - Complete Architecture Diagrams Index

> Generated: 2026-04-25
> Repository: d:\shop\web site php

---

## Overview

This document provides a comprehensive visual documentation of the Buddika Stores e-commerce and POS system. All diagrams are rendered using Mermaid syntax and can be viewed in any Markdown editor that supports Mermaid (GitHub, VS Code with extension, etc.).

---

## Diagram Categories

### 1. System Architecture
| File | Description |
|------|-------------|
| [01-system-architecture.md](01-system-architecture.md) | Overall system architecture showing all components, services, and their relationships |

### 2. Database & Data Models
| File | Description |
|------|-------------|
| [02-database-schema.md](02-database-schema.md) | Complete Firestore database schema with all collections and relationships |

### 3. User Flows
| File | Description |
|------|-------------|
| [03-user-flows.md](03-user-flows.md) | All user interaction flows including: Customer shopping, POS operations, Admin management, Delivery driver operations, Authentication, Offline/sync, AI chatbot, Payment processing, Newspaper automation |

### 4. File Structure
| File | Description |
|------|-------------|
| [04-file-structure.md](04-file-structure.md) | Complete project directory structure, service worker cache structure, PWA manifest, Electron app structure, and backend server structure |

### 5. JavaScript Modules
| File | Description |
|------|-------------|
| [05-javascript-modules.md](05-javascript-modules.md) | JavaScript module dependency graph, Firebase configuration structure, cart module internals, stock management structure, offline database structure, and Nex AI chatbot structure |

### 6. Data Flows
| File | Description |
|------|-------------|
| [06-data-flows.md](06-data-flows.md) | Real-time data sync, product management, sales transactions, authentication, category/navigation, promotions/marketing, offline recovery, finance tracking, and news automation |

### 7. Integrations & Security
| File | Description |
|------|-------------|
| [07-integrations-security.md](07-integrations-security.md) | External integrations overview, Firebase security model, backend security architecture, content protection system, IPC bridge security, two Firebase projects architecture, PWA installation flow, deployment architecture, and technology stack summary |

---

## Quick Reference

### Application Types
| Type | Entry Point | Purpose |
|------|-------------|---------|
| **Web Storefront (PWA)** | [index.html](../index.html) | Customer shopping experience |
| **Product Catalog** | [products.html](../products.html) | Browse and search products |
| **Point of Sale** | [pos.html](../pos.html) | Sales transaction processing |
| **Admin Dashboard** | [admin.html](../admin.html) | Store management |
| **Electron POS** | [electron-app/src/pos.html](../electron-app/src/pos.html) | Desktop POS application |

### Key Technologies
- **Frontend**: Vanilla JS, Tailwind CSS, HTML5
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore (cloud), SQLite (local), IndexedDB (browser)
- **Auth**: Firebase Authentication (Google, Email)
- **Payments**: HelaPay QR
- **AI**: Google Gemini API
- **Desktop**: Electron

### Firebase Collections
- `products` - Product catalog
- `sales` - Sales transactions
- `orders` - Customer orders
- `users` - User profiles
- `categories` - Product categories
- `suppliers` - Supplier management
- `stock_movements` - Inventory tracking
- `promotions` - Marketing offers
- `bundles` - Product bundles
- `news` - Blog/articles
- `delivery_drivers` - Driver management
- `finance_*` - Financial tracking
- `settings` - App configuration

---

## Viewing the Diagrams

### VS Code
Install the "Markdown Preview Mermaid Support" extension to view diagrams directly in VS Code.

### GitHub
Mermaid diagrams render automatically in GitHub Markdown files.

### Online
Use [Mermaid Live Editor](https://mermaid.live/) to edit and preview diagrams.

### Exporting
To export as images:
1. Copy diagram code
2. Paste in [Mermaid Live Editor](https://mermaid.live/)
3. Export as PNG/SVG

---

## Diagram Statistics

| Category | Diagrams | Total |
|----------|----------|-------|
| System Architecture | 1 | 1 |
| Database Schema | 1 | 1 |
| User Flows | 11 | 11 |
| File Structure | 5 | 5 |
| JavaScript Modules | 6 | 6 |
| Data Flows | 9 | 9 |
| Integrations & Security | 9 | 9 |
| **Total** | **42** | **42** |

---

## How to Use These Diagrams

1. **New Developer Onboarding**: Start with [01-system-architecture.md](01-system-architecture.md) for overall understanding
2. **Database Design**: Reference [02-database-schema.md](02-database-schema.md) for data structure
3. **Feature Development**: Check relevant user flows in [03-user-flows.md](03-user-flows.md)
4. **Code Navigation**: Use [04-file-structure.md](04-file-structure.md) and [05-javascript-modules.md](05-javascript-modules.md)
5. **Integration Work**: Reference [06-data-flows.md](06-data-flows.md) and [07-integrations-security.md](07-integrations-security.md)
6. **Security Audits**: Focus on security diagrams in [07-integrations-security.md](07-integrations-security.md)

---

## Maintenance

These diagrams should be updated when:
- New features are added
- Database schema changes
- New integrations are implemented
- Architecture is refactored

---

*Generated by Claude Code - Analysis performed on 2026-04-25*