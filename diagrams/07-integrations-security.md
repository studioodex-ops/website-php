# Buddika Stores - Integration & Security Diagrams

> Generated: 2026-04-25

---

## 32. External Integrations Overview

```mermaid
graph TB
    subgraph "Application Core"
        APP["Buddika Stores<br/>Application"]
    end

    subgraph "Payment Integration"
        HELAPAY["HelaPay<br/>QR Payment Gateway"]
        HELAPAY --> QR_GEN["QR Code<br/>Generation"]
        HELAPAY --> PAYMENT_API["Payment API<br/>Endpoint"]
        HELAPAY --> TRANSACTION["Transaction<br/>Verification"]
    end

    subgraph "AI Integration"
        GEMINI["Google Gemini<br/>AI API"]
        GEMINI --> NEX_CHATBOT["Nex Assistant<br/>Chatbot"]
        GEMINI --> PRODUCT_REC["Product<br/>Recommendations"]
        GEMINI --> SEARCH_ENHANCE["Enhanced<br/>Search"]
    end

    subgraph "Barcode Integration"
        QUAGGAJS["QuaggaJS<br/>Barcode Scanner"]
        QUAGGAJS --> CAM_ACCESS["Camera<br/>Access"]
        QUAGGAJS --> BARCODE_DEC["Barcode<br/>Decoder"]
        QUAGGAJS --> PRODUCT_FIND["Product<br/>Lookup"]
    end

    subgraph "Excel Integration"
        SHEETJS["SheetJS<br/>Excel Library"]
        SHEETJS --> IMPORT["Import Products<br/>Excel"]
        SHEETJS --> EXPORT["Export Reports<br/>Excel"]
        SHEETJS --> DATA_PARSE["Data<br/>Parsing"]
    end

    subgraph "Charts Integration"
        CHARTJS["Chart.js<br/>Charts Library"]
        CHARTJS --> SALES_CHART["Sales<br/>Analytics"]
        CHARTJS --> STOCK_CHART["Stock<br/>Visualization"]
        CHARTJS --> FINANCE_CHART["Finance<br/>Reports"]
    end

    subgraph "RSS/News Integration"
        RSS_PARSER["RSS Parser<br/>Library"]
        PUPPETEER["Puppeteer<br/>Web Scraper"]
        CHEERIO["Cheerio<br/>HTML Parser"]
        RSS_PARSER --> NEWS_AUTO["News<br/>Automation"]
        PUPPETEER --> NEWS_AUTO
        CHEERIO --> NEWS_AUTO
    end

    subgraph "Printing Integration"
        HTML2CANVAS["html2canvas<br/>Print Library"]
        HTML2CANVAS --> RECEIPT_PRINT["Receipt<br/>Printing"]
        HTML2CANVAS --> LABEL_PRINT["Label<br/>Printing"]
    end

    %% Connections
    APP --> HELAPAY
    APP --> GEMINI
    APP --> QUAGGAJS
    APP --> SHEETJS
    APP --> CHARTJS
    APP --> HTML2CANVAS

    NEWS_AUTO -->|"Data"| APP
```

---

## 33. Firebase Security Model

```mermaid
graph TD
    subgraph "Authentication Layer"
        AUTH_RULE["auth != null<br/>Must be signed in"]
        ROLE_CHECK["resource.data.role<br/>Role verification"]
        OWNER_CHECK["request.auth.uid == uid<br/>Owner verification"]
    end

    subgraph "Collection Rules"
        PRODUCTS_RULE["products/<br/>Readable: All<br/>Writable: Admin/POS"]
        SALES_RULE["sales/<br/>Readable: Owner/Admin<br/>Writable: POS/Admin"]
        USERS_RULE["users/<br/>Readable: Owner<br/>Writable: Owner/Admin"]
        ORDERS_RULE["orders/<br/>Readable: Owner/Admin<br/>Writable: Owner"]
    end

    subgraph "Tenant Isolation"
        TENANT_ID["tenantId Match<br/>Multi-tenant"]
        TENANT_COL["/tenants/{tenantId}<br/>Tenant Root"]
        ISOLATED_DATA["Tenant-Isolated<br/>Data Access"]
    end

    subgraph "Role Types"
        ROLE_ADMIN["role: admin<br/>Full Access"]
        ROLE_POS["role: pos<br/>Sales + Stock"]
        ROLE_CUSTOMER["role: customer<br/>Read + Own Data"]
        ROLE_DRIVER["role: driver<br/>Delivery Only"]
    end

    %% Auth flow
    AUTH_RULE --> ROLE_CHECK
    ROLE_CHECK --> OWNER_CHECK

    %% Collection rules
    PRODUCTS_RULE -->|"Admin"| ROLE_ADMIN
    PRODUCTS_RULE -->|"POS"| ROLE_POS

    SALES_RULE -->|"Admin"| ROLE_ADMIN
    SALES_RULE -->|"POS"| ROLE_POS
    SALES_RULE -->|"Owner"| OWNER_CHECK

    USERS_RULE -->|"Admin"| ROLE_ADMIN
    USERS_RULE -->|"Owner"| OWNER_CHECK

    ORDERS_RULE -->|"Admin"| ROLE_ADMIN
    ORDERS_RULE -->|"Owner"| OWNER_CHECK

    %% Tenant isolation
    TENANT_ID --> TENANT_COL
    TENANT_COL --> ISOLATED_DATA
    ISOLATED_DATA --> PRODUCTS_RULE
    ISOLATED_DATA --> SALES_RULE
```

---

## 34. Backend Security Architecture

```mermaid
graph TD
    subgraph "Request Flow"
        REQUEST["Incoming<br/>Request"]
        CORS_CHECK["CORS<br/>Validation"]
        RATE_LIMIT["Rate Limit<br/>100 req/15min"]
        HELMET["Helmet<br/>Security Headers"]
        JWT_VERIFY["JWT<br/>Verification"]
        ROLE_VERIFY["Role<br/>Verification"]
    end

    subgraph "Security Headers"
        XSS_FILTER["X-XSS-Protection"]
        NO_SNIFF["X-Content-Type-Options"]
        HSTS["Strict-Transport-Security"]
        CSP["Content-Security-Policy"]
        FRAME_OPT["X-Frame-Options"]
    end

    subgraph "Rate Limiting"
        IP_TRACK["IP Tracking"]
        COUNT_REQ["Count Requests"]
        BLOCK_IP["Block if > 100<br/>per 15min"]
        RESET_COUNT["Reset Counter<br/>After 15min"]
    end

    subgraph "CORS Configuration"
        ALLOW_ORIGINS["Allowed Origins<br/>Specific Domains"]
        ALLOW_METHODS["Allowed Methods<br/>GET, POST, PUT, DELETE"]
        ALLOW_HEADERS["Allowed Headers<br/>Content-Type, Authorization"]
        CREDENTIALS["Credentials<br/>Enabled"]
    end

    %% Request flow
    REQUEST --> CORS_CHECK
    CORS_CHECK -->|"Valid"| RATE_LIMIT
    CORS_CHECK -->|"Invalid"| REJECT["Reject"]
    RATE_LIMIT -->|"OK"| HELMET
    RATE_LIMIT -->|"Exceeded"| BLOCK_IP
    HELMET --> JWT_VERIFY
    JWT_VERIFY -->|"Valid"| ROLE_VERIFY
    JWT_VERIFY -->|"Invalid"| REJECT
    ROLE_VERIFY -->|"Allowed"| HANDLER["Request Handler"]
    ROLE_VERIFY -->|"Forbidden"| REJECT

    %% Headers
    HELMET --> XSS_FILTER
    HELMET --> NO_SNIFF
    HELMET --> HSTS
    HELMET --> CSP
    HELMET --> FRAME_OPT

    %% Rate limiting
    RATE_LIMIT --> IP_TRACK
    IP_TRACK --> COUNT_REQ
    COUNT_REQ -->|"Check"| BLOCK_IP
    COUNT_REQ --> RESET_COUNT
```

---

## 35. Content Protection System

```mermaid
graph TD
    subgraph "protection.js Module"
        INIT_PROTECT["Initialize<br/>Protection"]
        DISABLE_RC["Disable<br/>Right-Click"]
        DISABLE_DEV["Detect<br/>DevTools"]
        DISABLE_SEL["Disable<br/>Text Selection"]
        DISABLE_COPY["Disable<br/>Copy/Paste"]
        DISABLE_SAVE["Disable<br/>Save shortcuts"]
    end

    subgraph "Event Handlers"
        CONTEXT_MENU["contextmenu<br/>Event"]
        KEYDOWN["keydown<br/>Event"]
        SELECT_START["selectstart<br/>Event"]
        COPY_EVENT["copy<br/>Event"]
        DEVTOOLS_DETECT["DevTools<br/>Detection Timer"]
    end

    subgraph "Actions"
        PREVENT_DEFAULT["preventDefault()<br/>Block Action"]
        SHOW_WARNING["Show Warning<br/>Message"]
        REDIRECT["Redirect to<br/>Warning Page"]
        LOG_ATTEMPT["Log Attempt<br/>Analytics"]
    end

    %% Protection init
    INIT_PROTECT --> DISABLE_RC
    INIT_PROTECT --> DISABLE_DEV
    INIT_PROTECT --> DISABLE_SEL
    INIT_PROTECT --> DISABLE_COPY
    INIT_PROTECT --> DISABLE_SAVE

    %% Events
    DISABLE_RC --> CONTEXT_MENU
    DISABLE_DEV --> DEVTOOLS_DETECT
    DISABLE_SEL --> SELECT_START
    DISABLE_COPY --> COPY_EVENT
    DISABLE_SAVE --> KEYDOWN

    %% Actions
    CONTEXT_MENU --> PREVENT_DEFAULT
    CONTEXT_MENU --> SHOW_WARNING
    DEVTOOLS_DETECT -->|"Detected"| REDIRECT
    SELECT_START --> PREVENT_DEFAULT
    COPY_EVENT --> PREVENT_DEFAULT
    KEYDOWN -->|"Ctrl+S"| PREVENT_DEFAULT
    KEYDOWN -->|"Ctrl+C"| PREVENT_DEFAULT

    %% Logging
    PREVENT_DEFAULT --> LOG_ATTEMPT
    SHOW_WARNING --> LOG_ATTEMPT
    REDIRECT --> LOG_ATTEMPT
```

---

## 36. IPC Bridge (Electron Security)

```mermaid
graph TD
    subgraph "Main Process"
        MAIN_PROC["Main Process<br/>Node.js Environment"]
        IPC_HANDLER["ipcMain.handle()<br/>Secure Handler"]
        DB_OPERATIONS["Database<br/>Operations"]
        FILE_OPERATIONS["File System<br/>Access"]
        NETWORK_CHECK["Network<br/>Status Check"]
    end

    subgraph "Preload Script"
        PRELOAD["preload.js<br/>Secure Bridge"]
        CONTEXT_BRIDGE["contextBridge<br/>Expose API"]
        ELECTRON_API["electronAPI<br/>Limited Interface"]
    end

    subgraph "Renderer Process"
        RENDERER["Renderer Process<br/>Browser Environment"]
        POS_UI["POS UI<br/>pos.html"]
        API_CALL["API Call<br/>via electronAPI"]
    end

    subgraph "Allowed Operations"
        DB_GET["db:getProducts"]
        DB_ADD["db:addProduct"]
        DB_UPDATE["db:updateProduct"]
        DB_DELETE["db:deleteProduct"]
        DB_SALE["db:saveSale"]
        NET_CHECK["network:isOnline"]
    end

    %% Main process
    MAIN_PROC --> IPC_HANDLER
    IPC_HANDLER --> DB_OPERATIONS
    IPC_HANDLER --> FILE_OPERATIONS
    IPC_HANDLER --> NETWORK_CHECK

    %% Preload bridge
    PRELOAD --> CONTEXT_BRIDGE
    CONTEXT_BRIDGE --> ELECTRON_API

    %% Allowed ops
    ELECTRON_API --> DB_GET
    ELECTRON_API --> DB_ADD
    ELECTRON_API --> DB_UPDATE
    ELECTRON_API --> DB_DELETE
    ELECTRON_API --> DB_SALE
    ELECTRON_API --> NET_CHECK

    %% Renderer
    RENDERER --> POS_UI
    POS_UI --> API_CALL
    API_CALL -->|"invoke"| ELECTRON_API

    %% IPC communication
    API_CALL -.->|"IPC"| IPC_HANDLER
    IPC_HANDLER -.->|"Result"| API_CALL

    %% Security note
    NO_DIRECT["No Direct Access<br/>to Node.js"] --> RENDERER
```

---

## 37. Two Firebase Projects Architecture

```mermaid
graph TB
    subgraph "Web App Firebase Project"
        WEB_PROJECT["buddika-stores-web<br/>Web App Project"]
        WEB_AUTH["Firebase Auth<br/>Customers"]
        WEB_FS["Firestore<br/>Main Database"]
        WEB_STORAGE["Cloud Storage<br/>Product Images"]
    end

    subgraph "Electron Firebase Project"
        ELECTRON_PROJECT["buddikashopbizportal<br/>Biz Portal Project"]
        ELECTRON_AUTH["Firebase Auth<br/>Staff"]
        ELECTRON_FS["Firestore<br/>Sync Database"]
        ELECTRON_ADMIN["Firebase Admin SDK<br/>Server Access"]
    end

    subgraph "Web Client"
        WEB_BROWSER["Web Browser<br/>PWA"]
        WEB_CLIENTS["Customer<br/>Orders"]
    end

    subgraph "Electron Client"
        ELECTRON_APP["Electron App<br/>POS Desktop"]
        POS_USERS["POS Staff<br/>Sales"]
    end

    %% Web connections
    WEB_BROWSER --> WEB_PROJECT
    WEB_CLIENTS --> WEB_AUTH
    WEB_BROWSER --> WEB_FS
    WEB_BROWSER --> WEB_STORAGE

    %% Electron connections
    ELECTRON_APP --> ELECTRON_PROJECT
    POS_USERS --> ELECTRON_AUTH
    ELECTRON_APP --> ELECTRON_FS
    ELECTRON_ADMIN --> ELECTRON_FS

    %% Cross-project sync (if needed)
    SYNC_NOTE["Note: Separate<br/>Projects"] --> WEB_PROJECT
    SYNC_NOTE --> ELECTRON_PROJECT

    %% Data separation
    WEB_FS -->|"Customer Data"| WEB_DATA["Web Data<br/>Isolated"]
    ELECTRON_FS -->|"POS Data"| ELECTRON_DATA["POS Data<br/>Isolated"]
```

---

## 38. PWA Installation & Update Flow

```mermaid
flowchart TD
    subgraph "Installation"
        VISIT["User Visits Site"]
        MANIFEST_CHECK["Check<br/>manifest.json"]
        SW_REGISTER["Register<br/>Service Worker"]
        INSTALL_PROMPT["Install<br/>Prompt"]
        USER_ACCEPT["User<br/>Accepts"]
        INSTALLED["App<br/>Installed"]
    end

    subgraph "Update Check"
        SW_UPDATE["Service Worker<br/>Update Detected"]
        VERSION_CHECK["Version<br/>Comparison"]
        NEW_VERSION["New Version<br/>Available"]
        UPDATE_PROMPT["Update<br/>Prompt"]
    end

    subgraph "Cache Update"
        CACHE_NEW["Cache New<br/>Assets"]
        CACHE_OLD["Keep Old<br/>until Activate"]
        ACTIVATE_NEW["Activate<br/>New SW"]
        CLEAR_OLD["Clear Old<br/>Cache"]
    end

    %% Installation flow
    VISIT --> MANIFEST_CHECK
    MANIFEST_CHECK -->|"Valid"| SW_REGISTER
    SW_REGISTER -->|"Ready"| INSTALL_PROMPT
    INSTALL_PROMPT -->|"Show"| USER_ACCEPT
    USER_ACCEPT -->|"Yes"| INSTALLED

    %% Update flow
    INSTALLED -->|"On Load"| SW_UPDATE
    SW_UPDATE --> VERSION_CHECK
    VERSION_CHECK -->|"Different"| NEW_VERSION
    NEW_VERSION --> UPDATE_PROMPT
    UPDATE_PROMPT -->|"User Accept"| CACHE_NEW

    %% Cache management
    CACHE_NEW -->|"Install"| CACHE_OLD
    CACHE_OLD -->|"Skip Waiting"| ACTIVATE_NEW
    ACTIVATE_NEW -->|"Claim"| CLEAR_OLD
    CLEAR_OLD -->|"Ready"| UPDATED["App Updated"]

    %% Background update
    SW_REGISTER -->|"Check Daily"| SW_UPDATE
```

---

## 39. Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        LOCAL_DEV["Local<br/>Development"]
        GIT_REPO["Git<br/>Repository"]
        LOCAL_TEST["Local<br/>Testing"]
    end

    subgraph "Build Process"
        BUILD["Build<br/>Process"]
        MINIFY["Minify<br/>Assets"]
        VERSION_UPDATE["Update<br/>version.json"]
        SW_UPDATE_B["Update<br/>Service Worker"]
    end

    subgraph "Deployment Platforms"
        FIREBASE_HOSTING["Firebase<br/>Hosting"]
        ELECTRON_BUILD["Electron<br/>Build"]
        BACKEND_DEPLOY["Backend<br/>Deployment"]
    end

    subgraph "Production"
        PROD_WEB["Production<br/>Web App"]
        PROD_POS["Production<br/>POS Desktop"]
        PROD_API["Production<br/>API Server"]
    end

    subgraph "CDN & Cache"
        CDN["Firebase<br/>CDN"]
        EDGE_CACHE["Edge<br/>Cache"]
        ASSET_CACHE["Asset<br/>Cache"]
    end

    %% Development flow
    LOCAL_DEV --> GIT_REPO
    GIT_REPO -->|"Push"| BUILD

    %% Build process
    BUILD --> MINIFY
    BUILD --> VERSION_UPDATE
    BUILD --> SW_UPDATE_B

    %% Deployment
    MINIFY --> FIREBASE_HOSTING
    MINIFY --> ELECTRON_BUILD
    MINIFY --> BACKEND_DEPLOY

    %% Production
    FIREBASE_HOSTING --> PROD_WEB
    ELECTRON_BUILD --> PROD_POS
    BACKEND_DEPLOY --> PROD_API

    %% CDN
    FIREBASE_HOSTING --> CDN
    CDN --> EDGE_CACHE
    EDGE_CACHE --> ASSET_CACHE
    ASSET_CACHE -->|"Fast Load"| PROD_WEB
```

---

## 40. Technology Stack Summary

```mermaid
graph TD
    subgraph "Frontend Stack"
        HTML5["HTML5"]
        CSS3["CSS3 +<br/>Tailwind CSS"]
        JS_ES6["JavaScript ES6+<br/>Vanilla"]
        PWA["PWA<br/>Progressive Web App"]
    end

    subgraph "Backend Stack"
        NODEJS["Node.js"]
        EXPRESS["Express.js"]
        FIREBASE_ADMIN["Firebase<br/>Admin SDK"]
    end

    subgraph "Database Stack"
        FIRESTORE["Firestore<br/>Cloud NoSQL"]
        SQLITE["SQLite<br/>Local (Electron)"]
        INDEXEDDB["IndexedDB<br/>Browser"]
        LOCALSTORAGE["LocalStorage<br/>Session"]
    end

    subgraph "Desktop Stack"
        ELECTRON["Electron"]
        SQLJS["sql.js<br/>In-memory SQLite"]
    end

    subgraph "Services Stack"
        FB_AUTH["Firebase<br/>Authentication"]
        FB_STORAGE["Firebase<br/>Storage"]
        HELAPAY_API["HelaPay<br/>Payment"]
        GEMINI_API["Gemini<br/>AI API"]
    end

    subgraph "Libraries Stack"
        QUAGGAJS_LIB["QuaggaJS<br/>Barcode"]
        SHEETJS_LIB["SheetJS<br/>Excel"]
        CHARTJS_LIB["Chart.js<br/>Charts"]
        HTML2CANVAS_LIB["html2canvas<br/>Print"]
        PUPPETEER_LIB["Puppeteer<br/>Scraping"]
    end

    %% Connections
    HTML5 --> PWA
    CSS3 --> PWA
    JS_ES6 --> PWA

    NODEJS --> EXPRESS
    EXPRESS --> FIREBASE_ADMIN

    FIRESTORE -->|"Cloud"| FIREBASE_ADMIN
    SQLITE -->|"Local"| ELECTRON
    INDEXEDDB -->|"Local"| PWA

    ELECTRON --> SQLJS

    FB_AUTH --> PWA
    FB_STORAGE --> PWA

    HELAPAY_API --> PWA
    GEMINI_API --> JS_ES6

    QUAGGAJS_LIB --> JS_ES6
    SHEETJS_LIB --> JS_ES6
    CHARTJS_LIB --> JS_ES6
    HTML2CANVAS_LIB --> JS_ES6
    PUPPETEER_LIB --> NODEJS
```