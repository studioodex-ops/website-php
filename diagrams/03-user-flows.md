# Buddika Stores - User Flow Diagrams

> Generated: 2026-04-25

---

## 3. Customer Shopping Flow

```mermaid
flowchart TD
    START([Customer Visits Store]) --> HOME[View Homepage<br/>index.html]
    HOME --> BROWSE[Browse Categories]
    HOME --> SEARCH[Search Products]
    HOME --> PROMO[View Promotions]

    BROWSE --> PRODUCTS[Products Page<br/>products.html]
    SEARCH --> PRODUCTS
    PROMO --> PRODUCTS

    PRODUCTS --> FILTER[Filter by Category]
    PRODUCTS --> SORT[Sort by Price/Name]
    FILTER --> VIEW[View Product Details]
    SORT --> VIEW

    VIEW --> DECIDE{Add to Cart?}
    DECIDE -->|Yes| ADD[Add to Cart]
    DECIDE -->|No| PRODUCTS

    ADD --> CART[View Cart]
    CART --> MODIFY{Modify Cart?}
    MODIFY -->|Yes| UPDATE[Update Quantity<br/>Remove Items]
    MODIFY -->|No| CHECKOUT

    UPDATE --> CART

    CHECKOUT{Checkout Options}
    CHECKOUT -->|Guest| GUEST[Guest Checkout]
    CHECKOUT -->|Account| LOGIN{Logged In?}

    LOGIN -->|No| AUTH[Login/Register<br/>login.html]
    LOGIN -->|Yes| PROFILE[Select Address<br/>profile.html]

    AUTH --> PROFILE
    GUEST --> ADDRESS[Enter Delivery Address]

    ADDRESS --> PAYMENT
    PROFILE --> PAYMENT{Payment Method}

    PAYMENT -->|HelaPay QR| HELAPAY[Scan QR Code]
    PAYMENT -->|Cash on Delivery| COD[Confirm COD]

    HELAPAY --> CONFIRM[Confirm Payment]
    COD --> CONFIRM

    CONFIRM --> ORDER[Order Created]
    ORDER --> SUCCESS([Order Complete])

    %% Abandoned Cart Path
    CART --> LEAVE{Leave Site?}
    LEAVE -->|Yes| ABANDON[Cart Saved to<br/>abandoned_carts]
    ABANDON --> RECOVER[Email Recovery<br/>Notification]

    %% Chatbot Path
    HOME --> CHATBOT[Ask Nex Assistant<br/>AI Chatbot]
    CHATBOT --> PRODUCTS

    %% Offline Path
    PRODUCTS --> OFFLINE{Offline?}
    OFFLINE -->|Yes| IDB[Load from IndexedDB]
    OFFLINE -->|No| FIREBASE[Load from Firebase]
    IDB --> VIEW
    FIREBASE --> VIEW
```

---

## 4. POS Operator Flow

```mermaid
flowchart TD
    START([POS Operator Login]) --> POS[POS Dashboard<br/>pos.html]

    POS --> SCAN[Scan Barcode<br/>QuaggaJS]
    POS --> SEARCH[Search Product<br/>Manual]
    POS --> CATEGORY[Browse Categories]

    SCAN --> FIND{Product Found?}
    SEARCH --> FIND

    FIND -->|Yes| ADD[Add to Cart]
    FIND -->|No| CREATE{Create New Product?}

    CREATE -->|Yes| NEW[Add New Product<br/>Form]
    CREATE -->|No| SEARCH

    NEW --> ADD

    CATEGORY --> SELECT[Select Product]
    SELECT --> ADD

    ADD --> CART[View Cart]
    CART --> MORE{More Items?}
    MORE -->|Yes| SCAN
    MORE -->|No| CUSTOMER{Customer Info?}

    CUSTOMER -->|Yes| INFO[Enter Customer<br/>Name/Phone]
    CUSTOMER -->|No| DISCOUNT

    INFO --> DISCOUNT{Apply Discount?}
    DISCOUNT -->|Yes| SETDISC[Set Discount<br/>Amount/%]
    DISCOUNT -->|No| PAY

    SETDISC --> PAY{Payment Method}

    PAY -->|Cash| CASH[Enter Cash Amount]
    PAY -->|Card| CARD[Card Payment]
    PAY -->|HelaPay QR| QR[HelaPay QR]

    CASH --> CALC[Calculate Change]
    CARD --> PROCESS[Process Payment]
    QR --> SCANQR[Customer Scans QR]

    CALC --> FINALIZE
    PROCESS --> FINALIZE
    SCANQR --> FINALIZE[Finalize Sale]

    FINALIZE --> PRINT{Print Receipt?}
    PRINT -->|Yes| RECEIPT[Print Receipt<br/>html2canvas]
    PRINT -->|No| STOCK

    RECEIPT --> STOCK[Update Stock<br/>Firebase]
    STOCK --> SYNC{Sync to Cloud?}

    SYNC -->|Online| FIREBASE[Sync to Firebase]
    SYNC -->|Offline| SQLITE[Save to SQLite<br/>Queue for Sync]

    FIREBASE --> COMPLETE([Sale Complete])
    SQLITE --> COMPLETE

    %% Stock Alert
    POS --> ALERT{Low Stock Alert?}
    ALERT -->|Yes| WARN[Show Low Stock<br/>Warning]
    ALERT -->|No| SCAN
    WARN --> SCAN
```

---

## 5. Admin Dashboard Flow

```mermaid
flowchart TD
    START([Admin Login]) --> ADMIN[Admin Dashboard<br/>admin.html]

    ADMIN --> NAV{Navigation Choice}

    NAV --> PRODUCTS_TAB[Products Tab]
    NAV --> SALES_TAB[Sales Tab]
    NAV --> INVENTORY_TAB[Inventory Tab]
    NAV --> FINANCE_TAB[Finance Tab]
    NAV --> PROMOTIONS_TAB[Promotions Tab]
    NAV --> BUNDLES_TAB[Bundles Tab]
    NAV --> NEWS_TAB[News Tab]
    NAV --> SETTINGS_TAB[Settings Tab]

    %% Products Management
    PRODUCTS_TAB --> PROD_LIST[View Products List]
    PROD_LIST --> PROD_ACTION{Action?}
    PROD_ACTION -->|Add| PROD_ADD[Add New Product]
    PROD_ACTION -->|Edit| PROD_EDIT[Edit Product]
    PROD_ACTION -->|Delete| PROD_DELETE[Delete Product]
    PROD_ACTION -->|Import| PROD_IMPORT[Import from Excel<br/>SheetJS]

    PROD_ADD --> PROD_SAVE[Save to Firebase]
    PROD_EDIT --> PROD_SAVE
    PROD_DELETE --> PROD_CONFIRM{Confirm?}
    PROD_CONFIRM -->|Yes| PROD_DEL[Remove from Firebase]
    PROD_CONFIRM -->|No| PROD_LIST
    PROD_IMPORT --> PROD_PARSE[Parse Excel]
    PROD_PARSE --> PROD_BATCH[Batch Upload]
    PROD_BATCH --> PROD_SAVE

    %% Sales Analytics
    SALES_TAB --> SALES_VIEW[View Sales Dashboard]
    SALES_VIEW --> SALES_CHARTS[Charts & Graphs<br/>Chart.js]
    SALES_VIEW --> SALES_FILTER[Filter by Date/Category]
    SALES_VIEW --> SALES_EXPORT[Export to Excel]

    %% Inventory Management
    INVENTORY_TAB --> INV_VIEW[View Stock Levels]
    INV_VIEW --> INV_ALERT[Low Stock Alerts]
    INV_VIEW --> INV_MOVEMENT[Stock Movements]
    INV_VIEW --> INV_REORDER[Generate Reorder List]

    %% Finance Tracking
    FINANCE_TAB --> FIN_VIEW[View Financial Dashboard]
    FIN_VIEW --> FIN_DEPOSIT[Record Deposit]
    FIN_VIEW --> FIN_EXPENSE[Record Expense]
    FIN_VIEW --> FIN_CREDIT[Manage Credit Sales]
    FIN_VIEW --> FIN_SUMMARY[Daily Summary]

    %% Promotions
    PROMOTIONS_TAB --> PROMO_LIST[View Promotions]
    PROMO_LIST --> PROMO_ACTION{Action?}
    PROMO_ACTION -->|Create| PROMO_NEW[Create Promotion]
    PROMO_ACTION -->|Edit| PROMO_EDIT[Edit Promotion]
    PROMO_ACTION -->|Toggle| PROMO_TOGGLE[Activate/Deactivate]

    %% Bundles
    BUNDLES_TAB --> BUNDLE_LIST[View Bundles]
    BUNDLE_LIST --> BUNDLE_ACTION{Action?}
    BUNDLE_ACTION -->|Create| BUNDLE_NEW[Create Bundle<br/>Select Products]
    BUNDLE_ACTION -->|Edit| BUNDLE_EDIT[Edit Bundle]
    BUNDLE_ACTION -->|Toggle| BUNDLE_TOGGLE[Activate/Deactivate]

    %% News Management
    NEWS_TAB --> NEWS_LIST[View News Articles]
    NEWS_LIST --> NEWS_ACTION{Action?}
    NEWS_ACTION -->|Add| NEWS_ADD[Add Article]
    NEWS_ACTION -->|Edit| NEWS_EDIT[Edit Article]
    NEWS_ACTION -->|Delete| NEWS_DELETE[Delete Article]

    %% Settings
    SETTINGS_TAB --> SET_VIEW[View Settings]
    SET_VIEW --> SET_EDIT[Edit Configuration]
    SET_EDIT --> SET_API[Update API Keys<br/>Gemini, etc.]
    SET_EDIT --> SET_FEES[Update Courier Fees]
    SET_EDIT --> SET_HOURS[Update Store Hours]

    %% Back Navigation
    PROD_SAVE --> ADMIN
    PROD_DEL --> ADMIN
    SALES_EXPORT --> ADMIN
    INV_REORDER --> ADMIN
    FIN_SUMMARY --> ADMIN
    PROMO_TOGGLE --> ADMIN
    BUNDLE_TOGGLE --> ADMIN
    NEWS_DELETE --> ADMIN
    SET_EDIT --> ADMIN
```

---

## 6. Delivery Driver Flow

```mermaid
flowchart TD
    START([Driver Receives Order]) --> CHECK[Check Order Details]
    CHECK --> PICKUP[Go to Store]
    PICKUP --> COLLECT[Collect Items]
    COLLECT --> VERIFY{Verify Items?}
    VERIFY -->|Yes| CONFIRM[Confirm Pickup]
    VERIFY -->|No| ISSUE[Report Issue<br/>Missing Items]

    ISSUE --> RESOLVE[Resolve with Admin]
    RESOLVE --> COLLECT

    CONFIRM --> NAVIGATE[Navigate to<br/>Customer Address]
    NAVIGATE --> ARRIVE{Arrived?}
    ARRIVE -->|Yes| CALL[Call Customer]
    ARRIVE -->|No| NAVIGATE

    CALL --> DELIVER{Payment Status?}
    DELIVER -->|COD| COLLECT_PAY[Collect Payment]
    DELIVER -->|Prepaid| HANDOVER[Handover Items]

    COLLECT_PAY --> HANDOVER
    HANDOVER --> COMPLETE([Mark Delivered])
    COMPLETE --> UPDATE[Update Status<br/>in Firebase]
    UPDATE --> NEXT([Next Order])
```

---

## 7. Authentication Flow

```mermaid
flowchart TD
    START([User Visits Login]) --> LOGIN[Login Page<br/>login.html]
    LOGIN --> METHOD{Login Method?}

    METHOD -->|Email| EMAIL[Enter Email/Password]
    METHOD -->|Google| GOOGLE[Google OAuth Popup]

    EMAIL --> VALIDATE{Valid?}
    VALIDATE -->|Yes| AUTH[Firebase Auth]
    VALIDATE -->|No| ERROR[Show Error]

    GOOGLE --> AUTH

    AUTH --> CHECK_USER{User Exists?}
    CHECK_USER -->|Yes| ROLE{Check Role}
    CHECK_USER -->|No| CREATE[Create User Profile]

    CREATE --> ROLE

    ROLE -->|Customer| CUSTOMER[Redirect to<br/>index.html]
    ROLE -->|Admin| ADMIN[Redirect to<br/>admin.html]
    ROLE -->|POS Staff| POS[Redirect to<br/>pos.html]

    ERROR --> LOGIN

    %% Registration Path
    LOGIN --> REGISTER{New User?}
    REGISTER -->|Yes| REG_FORM[Registration Form]
    REGISTER -->|No| METHOD

    REG_FORM --> REG_DATA[Enter Details<br/>Name, Email, Password]
    REG_DATA --> REG_AUTH[Firebase Create User]
    REG_AUTH --> REG_PROFILE[Create Profile in<br/>Firestore]
    REG_PROFILE --> CUSTOMER
```

---

## 8. Offline & Sync Flow

```mermaid
flowchart TD
    START([App Loads]) --> CHECK_ONLINE{Online?}

    CHECK_ONLINE -->|Yes| FETCH[Fetch from Firebase]
    CHECK_ONLINE -->|No| LOCAL[Load from<br/>IndexedDB/SQLite]

    FETCH --> CACHE[Cache to<br/>Local Storage]
    LOCAL --> DISPLAY[Display Data]

    CACHE --> DISPLAY

    %% User Action While Offline
    DISPLAY --> ACTION{User Action?}
    ACTION -->|Browse| BROWSE[Browse Cached Data]
    ACTION -->|Add to Cart| ADD_CART[Add to<br/>IndexedDB Cart]
    ACTION -->|Checkout| CHECKOUT_OFFLINE[Queue Order<br/>for Sync]

    BROWSE --> ACTION
    ADD_CART --> ACTION

    CHECKOUT_OFFLINE --> QUEUE[Add to<br/>Sync Queue]
    QUEUE --> STORE_LOCAL[Store Locally]

    %% Sync When Online
    STORE_LOCAL --> WAIT[Wait for<br/>Connection]
    WAIT --> ONLINE{Online Again?}
    ONLINE -->|Yes| SYNC[Process<br/>Sync Queue]
    ONLINE -->|No| WAIT

    SYNC --> UPLOAD[Upload to<br/>Firebase]
    UPLOAD --> UPDATE_STOCK[Update Stock]
    UPDATE_STOCK --> CONFIRM([Sync Complete])

    %% Service Worker Caching
    FETCH --> SW_CACHE[Service Worker<br/>Cache Assets]
    SW_CACHE --> READY([App Ready])
```

---

## 9. AI Chatbot (Nex Assistant) Flow

```mermaid
flowchart TD
    START([User Opens Chatbot]) --> CHAT[Nex Assistant<br/>nex_v5_gold.js]
    CHAT --> INPUT[User Types Query]

    INPUT --> ANALYZE[Analyze Intent]

    ANALYZE --> INTENT{Query Type?}

    INTENT -->|Product Search| PROD_SEARCH[Search Products<br/>in Firebase]
    INTENT -->|Price Check| PRICE[Get Price Info]
    INTENT -->|Stock Check| STOCK[Check Stock<br/>Availability]
    INTENT -->|Category Browse| CAT_BROWSE[Browse Categories]
    INTENT -->|General Question| GENERAL[General Response<br/>Gemini API]
    INTENT -->|Order Help| ORDER_HELP[Order Status<br/>Check]

    PROD_SEARCH --> RESULTS[Format Results]
    PRICE --> RESULTS
    STOCK --> RESULTS
    CAT_BROWSE --> RESULTS
    GENERAL --> RESULTS
    ORDER_HELP --> RESULTS

    RESULTS --> DISPLAY[Display Response]
    DISPLAY --> FOLLOWUP{Follow-up?}

    FOLLOWUP -->|Yes| INPUT
    FOLLOWUP -->|No| CLOSE([Close Chatbot])
```

---

## 10. Newspaper Automation Flow

```mermaid
flowchart TD
    START([Scheduled Run<br/>Node.js Script]) --> FETCH_RSS[Fetch RSS Feeds<br/>Multiple Sources]

    FETCH_RSS --> PARSE[Parse RSS Items]
    PARSE --> FILTER[Filter by<br/>Category/Date]

    FILTER --> LOOP{More Items?}
    LOOP -->|Yes| SCRAPE[Web Scraper<br/>Puppeteer/Cheerio]
    LOOP -->|No| DONE([Complete])

    SCRAPE --> EXTRACT[Extract<br/>Title, Content, Image]
    EXTRACT --> CLEAN[Clean/Format<br/>Content]
    CLEAN --> CHECK{Duplicate?}

    CHECK -->|Yes| SKIP[Skip Item]
    CHECK -->|No| UPLOAD[Upload to<br/>Firebase Storage]

    SKIP --> LOOP
    UPLOAD --> SAVE_DB[Save to<br/>Firestore]
    SAVE_DB --> LOOP

    %% Update Products
    SAVE_DB --> UPDATE_PROD[Update Products<br/>Collection]
    UPDATE_PROD --> NOTIFY[Notify Admin<br/>if Needed]
    NOTIFY --> DONE
```

---

## 11. Payment Integration Flow (HelaPay)

```mermaid
flowchart TD
    START([Checkout Initiated]) --> SELECT[Select HelaPay<br/>QR Payment]
    SELECT --> GENERATE[Generate QR Code]

    GENERATE --> DISPLAY_QR[Display QR<br/>for Customer]
    DISPLAY_QR --> SCAN[Customer Scans<br/>with Mobile App]

    SCAN --> AUTH_PAYMENT[Authorize<br/>Payment in App]
    AUTH_PAYMENT --> PROCESS[Process Payment<br/>HelaPay Backend]

    PROCESS --> RESULT{Payment Status?}
    RESULT -->|Success| CONFIRM[Confirm Payment]
    RESULT -->|Failed| ERROR[Show Error<br/>Try Again]
    RESULT -->|Timeout| TIMEOUT[Payment Timeout]

    ERROR --> SELECT
    TIMEOUT --> SELECT

    CONFIRM --> VERIFY[Verify Transaction<br/>ID]
    VERIFY --> CREATE_ORDER[Create Order<br/>in Firestore]
    CREATE_ORDER --> UPDATE_STOCK[Update Stock<br/>Levels]
    UPDATE_STOCK --> SUCCESS([Payment Complete<br/>Order Confirmed])
```