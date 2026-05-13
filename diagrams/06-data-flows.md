# Buddika Stores - Data Flow Diagrams

> Generated: 2026-04-25

---

## 23. Real-Time Data Sync Flow

```mermaid
flowchart LR
    subgraph "Firebase Cloud"
        FS["Firestore<br/>Database"]
        STORAGE["Cloud<br/>Storage"]
        AUTH_FB["Firebase<br/>Auth"]
    end

    subgraph "Web Client"
        BROWSER["Browser"]
        SW_CLIENT["Service Worker"]
        IDB_CLIENT["IndexedDB"]
        LS_CLIENT["LocalStorage"]
    end

    subgraph "Electron Client"
        ELECTRON_APP["Electron App"]
        SQLITE_CLIENT["SQLite"]
        IPC_CLIENT["IPC Bridge"]
    end

    %% Real-time listeners
    FS -->|"onSnapshot<br/>Real-time"| BROWSER
    FS -->|"onSnapshot"| ELECTRON_APP

    %% Auth flow
    BROWSER -->|"Auth State"| AUTH_FB
    ELECTRON_APP -->|"Auth State"| AUTH_FB

    %% Storage flow
    BROWSER -->|"Upload Image"| STORAGE
    STORAGE -->|"Download URL"| BROWSER

    %% Offline caching
    FS -->|"Cache Data"| SW_CLIENT
    SW_CLIENT -->|"Store"| IDB_CLIENT

    %% Cart persistence
    BROWSER -->|"Cart Data"| LS_CLIENT

    %% Electron sync
    FS -->|"Pull Products"| IPC_CLIENT
    IPC_CLIENT -->|"Store"| SQLITE_CLIENT
    SQLITE_CLIENT -->|"Push Sales"| IPC_CLIENT
    IPC_CLIENT -->|"Sync"| FS
```

---

## 24. Product Management Data Flow

```mermaid
flowchart TD
    subgraph "Admin Actions"
        ADD_PROD["Add Product"]
        EDIT_PROD["Edit Product"]
        DELETE_PROD["Delete Product"]
        IMPORT_PROD["Import Excel"]
    end

    subgraph "Backend Processing"
        VALIDATE["Validate Data"]
        PROCESS_IMAGE["Process Image"]
        UPLOAD_IMAGE["Upload to<br/>Storage"]
        CREATE_DOC["Create/Update<br/>Firestore Doc"]
        UPDATE_CACHE["Update Cache"]
    end

    subgraph "Firebase"
        PRODUCTS_COL["products<br/>Collection"]
        STORAGE_PROD["Product<br/>Images"]
    end

    subgraph "Client Updates"
        SW_UPDATE["Service Worker<br/>Cache Update"]
        IDB_UPDATE["IndexedDB<br/>Local Update"]
        UI_REFRESH["UI<br/>Refresh"]
    end

    %% Admin flow
    ADD_PROD --> VALIDATE
    EDIT_PROD --> VALIDATE
    IMPORT_PROD --> PARSE["Parse Excel<br/>SheetJS"]
    PARSE --> VALIDATE

    VALIDATE --> PROCESS_IMAGE
    PROCESS_IMAGE --> UPLOAD_IMAGE
    UPLOAD_IMAGE --> STORAGE_PROD
    STORAGE_PROD -->|"URL"| CREATE_DOC
    CREATE_DOC --> PRODUCTS_COL

    DELETE_PROD --> DEL_DOC["Delete Doc"]
    DEL_DOC --> PRODUCTS_COL
    DEL_DOC --> DEL_IMG["Delete Image"]
    DEL_IMG --> STORAGE_PROD

    %% Real-time sync
    PRODUCTS_COL -->|"onSnapshot"| SW_UPDATE
    SW_UPDATE --> IDB_UPDATE
    IDB_UPDATE --> UI_REFRESH

    %% Stock updates
    SALES_COL["sales Collection"] -->|"Stock Change"| STOCK_DEC["Stock Decrement"]
    STOCK_DEC --> PRODUCTS_COL
```

---

## 25. Sales Transaction Data Flow

```mermaid
flowchart TD
    subgraph "POS Frontend"
        SCAN_BARCODE["Scan Barcode<br/>QuaggaJS"]
        ADD_TO_CART["Add to Cart"]
        CALC_TOTAL["Calculate Total"]
        SELECT_PAYMENT["Select Payment<br/>Method"]
        CONFIRM_SALE["Confirm Sale"]
    end

    subgraph "Payment Processing"
        HELAPAY_API["HelaPay API"]
        CASH_PAYMENT["Cash Payment"]
        CARD_PAYMENT["Card Payment"]
    end

    subgraph "Firestore Operations"
        SALES_COL["sales<br/>Collection"]
        PRODUCTS_COL["products<br/>Collection"]
        STOCK_MOV["stock_movements<br/>Collection"]
        STOCK_DEC["Stock Decrement<br/>Batch Update"]
    end

    subgraph "Offline Queue"
        SQLITE_QUEUE["SQLite Queue<br/>Electron"]
        IDB_QUEUE["IndexedDB Queue<br/>Web"]
        SYNC_PENDING["Pending Sync"]
    end

    subgraph "Post-Sale"
        PRINT_RECEIPT["Print Receipt<br/>html2canvas"]
        UPDATE_STOCK["Update Stock"]
        RECORD_MOVEMENT["Record Movement"]
    end

    %% Transaction flow
    SCAN_BARCODE -->|"Barcode"| FIND_PROD["Find Product"]
    FIND_PROD -->|"Product Data"| ADD_TO_CART
    ADD_TO_CART --> CALC_TOTAL
    CALC_TOTAL --> SELECT_PAYMENT

    %% Payment paths
    SELECT_PAYMENT -->|"HelaPay"| HELAPAY_API
    SELECT_PAYMENT -->|"Cash"| CASH_PAYMENT
    SELECT_PAYMENT -->|"Card"| CARD_PAYMENT

    HELAPAY_API -->|"Success"| CONFIRM_SALE
    CASH_PAYMENT --> CONFIRM_SALE
    CARD_PAYMENT --> CONFIRM_SALE

    %% Record sale
    CONFIRM_SALE -->|"Online"| CREATE_SALE["Create Sale Doc"]
    CONFIRM_SALE -->|"Offline"| QUEUE_SALE["Queue Sale"]

    CREATE_SALE --> SALES_COL
    QUEUE_SALE --> SQLITE_QUEUE
    QUEUE_SALE --> IDB_QUEUE

    %% Stock updates
    CREATE_SALE --> UPDATE_STOCK
    UPDATE_STOCK --> STOCK_DEC
    STOCK_DEC --> PRODUCTS_COL
    CREATE_SALE --> RECORD_MOVEMENT
    RECORD_MOVEMENT --> STOCK_MOV

    %% Receipt
    CREATE_SALE --> PRINT_RECEIPT

    %% Sync queue
    SQLITE_QUEUE -->|"When Online"| SYNC_PENDING
    IDB_QUEUE -->|"When Online"| SYNC_PENDING
    SYNC_PENDING --> SALES_COL
    SYNC_PENDING --> UPDATE_STOCK
```

---

## 26. Authentication Data Flow

```mermaid
flowchart TD
    subgraph "Login Page"
        LOGIN_FORM["Login Form<br/>login.html"]
        EMAIL_INPUT["Email Input"]
        PASS_INPUT["Password Input"]
        GOOGLE_BTN["Google Sign-in"]
        REG_FORM["Registration Form"]
    end

    subgraph "Firebase Auth"
        AUTH_SERVICE["Firebase<br/>Authentication"]
        USER_PROFILE["User Profile<br/>Firestore"]
    end

    subgraph "Session Management"
        AUTH_STATE["Auth State<br/>Listener"]
        TOKEN["JWT Token"]
        LOCAL_SESSION["Local Session<br/>Storage"]
    end

    subgraph "Role-Based Redirect"
        ROLE_CHECK["Check Role"]
        CUSTOMER_REDIRECT["Redirect to<br/>index.html"]
        ADMIN_REDIRECT["Redirect to<br/>admin.html"]
        POS_REDIRECT["Redirect to<br/>pos.html"]
    end

    %% Login flow
    LOGIN_FORM --> EMAIL_INPUT
    LOGIN_FORM --> PASS_INPUT
    EMAIL_INPUT -->|"Email/Pass"| AUTH_SERVICE
    PASS_INPUT -->|"Email/Pass"| AUTH_SERVICE
    GOOGLE_BTN -->|"OAuth"| AUTH_SERVICE

    %% Registration
    REG_FORM -->|"Create"| AUTH_SERVICE
    AUTH_SERVICE -->|"Create"| USER_PROFILE

    %% Auth result
    AUTH_SERVICE -->|"Success"| AUTH_STATE
    AUTH_SERVICE -->|"Token"| TOKEN
    TOKEN --> LOCAL_SESSION

    %% Role check
    AUTH_STATE -->|"User Data"| ROLE_CHECK
    ROLE_CHECK -->|"role: customer"| CUSTOMER_REDIRECT
    ROLE_CHECK -->|"role: admin"| ADMIN_REDIRECT
    ROLE_CHECK -->|"role: pos"| POS_REDIRECT

    %% User profile access
    USER_PROFILE -->|"Load Profile"| PROFILE_PAGE["Profile Page<br/>profile.html"]
    USER_PROFILE -->|"Order History"| ORDER_HISTORY["Order History"]
```

---

## 27. Category & Navigation Data Flow

```mermaid
flowchart TD
    subgraph "Firebase"
        CAT_COL["categories<br/>Collection"]
        PRODUCTS_BY_CAT["Products by<br/>Category"]
    end

    subgraph "Frontend Components"
        NAV_COMPONENT["Navigation<br/>Component"]
        CAT_GRID["Category Grid<br/>Homepage"]
        FILTER_MENU["Filter Menu<br/>Products Page"]
    end

    subgraph "Dynamic Rendering"
        RENDER_NAV["Render Navigation"]
        RENDER_GRID["Render Category Grid"]
        RENDER_FILTER["Render Filters"]
        RENDER_SUBCAT["Render Subcategories"]
    end

    subgraph "User Interaction"
        CLICK_CAT["Click Category"]
        SELECT_SUBCAT["Select Subcategory"]
        FILTER_PRODUCTS["Filter Products"]
    end

    %% Category loading
    CAT_COL -->|"onSnapshot"| NAV_COMPONENT
    CAT_COL -->|"load"| CAT_GRID
    CAT_COL -->|"load"| FILTER_MENU

    %% Rendering
    NAV_COMPONENT --> RENDER_NAV
    CAT_GRID --> RENDER_GRID
    FILTER_MENU --> RENDER_FILTER
    RENDER_FILTER --> RENDER_SUBCAT

    %% User actions
    RENDER_GRID -->|"Click"| CLICK_CAT
    CLICK_CAT -->|"Category ID"| PRODUCTS_BY_CAT
    RENDER_SUBCAT -->|"Select"| SELECT_SUBCAT
    SELECT_SUBCAT -->|"Subcategory ID"| PRODUCTS_BY_CAT

    PRODUCTS_BY_CAT -->|"Filtered"| FILTER_PRODUCTS
    FILTER_PRODUCTS -->|"Display"| PRODUCT_GRID["Product Grid"]

    %% Real-time updates
    CAT_COL -->|"Admin Update"| UPDATE_UI["UI Update"]
    UPDATE_UI --> RENDER_NAV
    UPDATE_UI --> RENDER_GRID
```

---

## 28. Promotions & Marketing Data Flow

```mermaid
flowchart TD
    subgraph "Admin Management"
        CREATE_PROMO["Create Promotion"]
        SET_DISCOUNT["Set Discount<br/>% or Fixed"]
        SET_EXPIRY["Set Expiry Date"]
        ACTIVATE["Activate/Deactivate"]
    end

    subgraph "Firebase"
        PROMO_COL["promotions<br/>Collection"]
        BUNDLE_COL["bundles<br/>Collection"]
    end

    subgraph "Frontend Display"
        HOME_BANNER["Home Banner<br/>Hero Section"]
        PROMO_SECTION["Promotions<br/>Section"]
        BUNDLE_SECTION["Bundles<br/>Section"]
        COUNTDOWN["Countdown Timer<br/>FOMO"]
    end

    subgraph "Shopping Impact"
        APPLY_DISCOUNT["Apply Discount<br/>to Cart"]
        BUNDLE_PRICE["Bundle Price<br/>Calculation"]
        CHECK_EXPIRY["Check Expiry"]
    end

    %% Admin actions
    CREATE_PROMO --> SET_DISCOUNT
    SET_DISCOUNT --> SET_EXPIRY
    SET_EXPIRY --> PROMO_COL

    ACTIVATE -->|"Toggle"| PROMO_COL
    ACTIVATE -->|"Toggle"| BUNDLE_COL

    %% Display
    PROMO_COL -->|"Active"| HOME_BANNER
    PROMO_COL -->|"Active"| PROMO_SECTION
    BUNDLE_COL -->|"Active"| BUNDLE_SECTION

    %% Countdown
    PROMO_COL -->|"Expiry"| COUNTDOWN
    COUNTDOWN -->|"Timer"| PROMO_SECTION

    %% Shopping impact
    PROMO_SECTION -->|"Add to Cart"| APPLY_DISCOUNT
    BUNDLE_SECTION -->|"Add Bundle"| BUNDLE_PRICE
    BUNDLE_PRICE -->|"Update Cart"| CART_TOTAL["Cart Total"]

    PROMO_COL -->|"Check"| CHECK_EXPIRY
    CHECK_EXPIRY -->|"Expired"| DEACTIVATE["Auto Deactivate"]
    DEACTIVATE --> PROMO_COL
```

---

## 29. Offline Recovery & Sync Data Flow

```mermaid
flowchart TD
    subgraph "Offline Detection"
        NETWORK_CHECK["Network Status<br/>Check"]
        OFFLINE_EVENT["Offline Event"]
        ONLINE_EVENT["Online Event"]
    end

    subgraph "Offline Storage"
        IDB_CART["IndexedDB<br/>Cart"]
        IDB_PRODUCTS["IndexedDB<br/>Products"]
        SQLITE_SALES["SQLite<br/>Sales Queue"]
        SYNC_QUEUE["Sync Queue"]
    end

    subgraph "Offline Operations"
        LOCAL_CART["Local Cart<br/>Operations"]
        LOCAL_SEARCH["Local Product<br/>Search"]
        QUEUE_ORDER["Queue Order"]
        QUEUE_SALE["Queue Sale"]
    end

    subgraph "Online Sync"
        SYNC_START["Sync Started"]
        SYNC_CART["Sync Cart"]
        SYNC_ORDERS["Sync Orders"]
        SYNC_SALES["Sync Sales"]
        SYNC_PRODUCTS["Sync Products"]
    end

    subgraph "Firebase"
        FS_ORDERS["orders<br/>Collection"]
        FS_SALES["sales<br/>Collection"]
        FS_PRODUCTS["products<br/>Collection"]
    end

    %% Offline detection
    NETWORK_CHECK -->|"Offline"| OFFLINE_EVENT
    NETWORK_CHECK -->|"Online"| ONLINE_EVENT

    %% Offline operations
    OFFLINE_EVENT -->|"Enable"| LOCAL_CART
    OFFLINE_EVENT -->|"Enable"| LOCAL_SEARCH

    LOCAL_CART -->|"Save"| IDB_CART
    LOCAL_SEARCH -->|"Load"| IDB_PRODUCTS

    QUEUE_ORDER -->|"Add"| IDB_CART
    QUEUE_SALE -->|"Add"| SQLITE_SALES

    QUEUE_ORDER --> SYNC_QUEUE
    QUEUE_SALE --> SYNC_QUEUE

    %% Online sync
    ONLINE_EVENT --> SYNC_START
    SYNC_START --> SYNC_CART
    SYNC_START --> SYNC_ORDERS
    SYNC_START --> SYNC_SALES
    SYNC_START --> SYNC_PRODUCTS

    SYNC_CART -->|"Pull"| FS_PRODUCTS
    SYNC_ORDERS -->|"Push"| FS_ORDERS
    SYNC_SALES -->|"Push"| FS_SALES
    SYNC_PRODUCTS -->|"Pull"| FS_PRODUCTS

    %% Update local after sync
    FS_PRODUCTS -->|"Update"| IDB_PRODUCTS
    FS_SALES -->|"Clear"| SQLITE_SALES
    FS_ORDERS -->|"Clear"| SYNC_QUEUE
```

---

## 30. Finance Tracking Data Flow

```mermaid
flowchart TD
    subgraph "Admin Finance Dashboard"
        DEPOSIT_FORM["Record Deposit"]
        EXPENSE_FORM["Record Expense"]
        CREDIT_FORM["Credit Sale"]
        SUMMARY_VIEW["Daily Summary"]
    end

    subgraph "Firebase Collections"
        FIN_DEPOSITS["finance_deposits<br/>Collection"]
        FIN_EXPENSES["finance_expenses<br/>Collection"]
        FIN_CREDIT["finance_credit_sales<br/>Collection"]
    end

    subgraph "Calculations"
        TOTAL_DEPOSITS["Total Deposits"]
        TOTAL_EXPENSES["Total Expenses"]
        NET_PROFIT["Net Profit"]
        CREDIT_BALANCE["Credit Balance"]
    end

    subgraph "Reports"
        DAILY_REPORT["Daily Report"]
        WEEKLY_REPORT["Weekly Report"]
        MONTHLY_REPORT["Monthly Report"]
        EXPORT_EXCEL["Export to Excel"]
    end

    %% Finance entries
    DEPOSIT_FORM -->|"Save"| FIN_DEPOSITS
    EXPENSE_FORM -->|"Save"| FIN_EXPENSES
    CREDIT_FORM -->|"Save"| FIN_CREDIT

    %% Calculations
    FIN_DEPOSITS -->|"Sum"| TOTAL_DEPOSITS
    FIN_EXPENSES -->|"Sum"| TOTAL_EXPENSES
    FIN_CREDIT -->|"Sum"| CREDIT_BALANCE

    TOTAL_DEPOSITS --> NET_PROFIT
    TOTAL_EXPENSES --> NET_PROFIT

    %% Reports
    NET_PROFIT --> DAILY_REPORT
    CREDIT_BALANCE --> DAILY_REPORT

    FIN_DEPOSITS -->|"Filter"| WEEKLY_REPORT
    FIN_EXPENSES -->|"Filter"| WEEKLY_REPORT

    FIN_DEPOSITS -->|"Filter"| MONTHLY_REPORT
    FIN_EXPENSES -->|"Filter"| MONTHLY_REPORT

    %% Export
    DAILY_REPORT --> EXPORT_EXCEL
    WEEKLY_REPORT --> EXPORT_EXCEL
    MONTHLY_REPORT --> EXPORT_EXCEL
```

---

## 31. News & Automation Data Flow

```mermaid
flowchart TD
    subgraph "Automation Script"
        SCHEDULED["Scheduled Run<br/>Cron/Manual"]
        RSS_FETCH["Fetch RSS Feeds<br/>Multiple Sources"]
        WEB_SCRAPER["Web Scraper<br/>Puppeteer"]
    end

    subgraph "Processing"
        PARSE_RSS["Parse RSS Items"]
        SCRAPE_CONTENT["Scrape Content<br/>Cheerio"]
        CLEAN_DATA["Clean/Format"]
        CHECK_DUPE["Check Duplicate"]
    end

    subgraph "Firebase Admin"
        FB_ADMIN["Firebase<br/>Admin SDK"]
        STORAGE_NEWS["Storage<br/>News Images"]
        NEWS_COL["news<br/>Collection"]
        PRODUCTS_NEWS["products<br/>News Items"]
    end

    subgraph "Frontend Display"
        NEWS_SECTION["News Section<br/>Homepage"]
        NEWS_PAGE["News Page"]
        NEWS_CARD["News Card"]
    end

    %% Automation flow
    SCHEDULED --> RSS_FETCH
    RSS_FETCH --> PARSE_RSS
    PARSE_RSS --> WEB_SCRAPER
    WEB_SCRAPER --> SCRAPE_CONTENT
    SCRAPE_CONTENT --> CLEAN_DATA
    CLEAN_DATA --> CHECK_DUPE

    %% Upload
    CHECK_DUPE -->|"Not Duplicate"| FB_ADMIN
    FB_ADMIN -->|"Upload Image"| STORAGE_NEWS
    STORAGE_NEWS -->|"URL"| NEWS_COL
    FB_ADMIN -->|"Save"| NEWS_COL
    FB_ADMIN -->|"Save"| PRODUCTS_NEWS

    %% Display
    NEWS_COL -->|"onSnapshot"| NEWS_SECTION
    NEWS_COL -->|"Load"| NEWS_PAGE
    NEWS_SECTION --> NEWS_CARD
    NEWS_PAGE --> NEWS_CARD
```