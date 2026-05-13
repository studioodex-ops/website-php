# Buddika Stores - Complete Architecture Diagrams

> Generated: 2026-04-25

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser - PWA]
        ELECTRON[Electron Desktop App]
        MOBILE[Mobile Browser]
    end

    subgraph "Frontend Applications"
        STORE[Storefront<br/>index.html]
        POS[POS System<br/>pos.html]
        ADMIN[Admin Dashboard<br/>admin.html]
        LOGIN[Authentication<br/>login.html]
    end

    subgraph "PWA Infrastructure"
        SW[Service Worker<br/>sw.js]
        IDB[IndexedDB<br/>offline-db.js]
        LS[LocalStorage<br/>Cart Persistence]
    end

    subgraph "Backend Services"
        EXPRESS[Express.js Server<br/>Port 3000]
        FIREBASE[Firebase Project<br/>buddika-stores-web]
        FIREBASE2[Firebase Project<br/>buddikashopbizportal]
    end

    subgraph "Firebase Services"
        AUTH[Firebase Auth<br/>Google + Email]
        FS[Firestore Database]
        STORAGE[Cloud Storage]
    end

    subgraph "Database Layer"
        SQLITE[SQLite Database<br/>Electron Only]
    end

    subgraph "External Integrations"
        HELAPAY[HelaPay Payment]
        GEMINI[Gemini AI API]
        RSS[RSS Feeds]
    end

    WEB --> STORE
    WEB --> POS
    WEB --> ADMIN
    ELECTRON --> POS
    ELECTRON --> ADMIN
    MOBILE --> STORE

    STORE --> SW
    POS --> SW
    ADMIN --> SW
    SW --> IDB
    SW --> LS

    STORE --> FIREBASE
    POS --> FIREBASE
    ADMIN --> FIREBASE
    ELECTRON --> FIREBASE2

    FIREBASE --> AUTH
    FIREBASE --> FS
    FIREBASE --> STORAGE

    FIREBASE2 --> FS

    ELECTRON --> SQLITE

    POS --> HELAPAY
    STORE --> GEMINI

    EXPRESS --> FIREBASE

    RSS --> AUTOMATION[Automation Scripts]
    AUTOMATION --> FS