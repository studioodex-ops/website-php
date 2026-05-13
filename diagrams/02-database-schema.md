# Buddika Stores - Database Schema

> Generated: 2026-04-25

---

## 2. Firestore Database Schema

```mermaid
erDiagram
    PRODUCTS {
        string id PK
        string name
        string name_si "Sinhala name"
        float price
        float cost
        string category FK
        string subcategory
        int stock
        string barcode UK
        string sku UK
        string image
        string unit
        string brand
        date expiryDate
        boolean active
        timestamp createdAt
        timestamp updatedAt
    }

    CATEGORIES {
        string id PK
        string name
        string name_si
        string icon
        string color
        array subcategories
        int sortOrder
    }

    SALES {
        string saleId PK
        array items
        float total
        float subtotal
        float discount
        string paymentMethod
        string cashier
        object customerInfo
        timestamp createdAt
        string status
        string driverId FK
    }

    ORDERS {
        string orderId PK
        string userId FK
        array items
        float total
        object deliveryAddress
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    USERS {
        string uid PK
        string email UK
        string displayName
        string phone
        object address
        string role
        timestamp createdAt
    }

    SUPPLIERS {
        string id PK
        string name
        string phone
        string email
        string address
        array products
    }

    STOCK_MOVEMENTS {
        string id PK
        string productId FK
        int change
        string operation
        timestamp timestamp
        string saleId FK
        string notes
    }

    PROMOTIONS {
        string id PK
        string title
        string description
        string image
        float discount
        string type
        boolean active
        timestamp createdAt
        timestamp expiresAt
    }

    BUNDLES {
        string id PK
        string name
        array products
        float discount
        float bundlePrice
        boolean active
        timestamp createdAt
    }

    NEWS {
        string id PK
        string title
        string content
        string image
        string category
        timestamp createdAt
    }

    DELIVERY_DRIVERS {
        string id PK
        string name
        string phone
        string vehicle
        string status
    }

    FINANCE_DEPOSITS {
        string id PK
        float amount
        date date
        string source
        string notes
    }

    FINANCE_EXPENSES {
        string id PK
        float amount
        date date
        string category
        string notes
    }

    FINANCE_CREDIT_SALES {
        string id PK
        string customer
        float amount
        date dueDate
        string status
    }

    ABANDONED_CARTS {
        string id PK
        string userId FK
        array items
        timestamp lastUpdated
        string status
    }

    BOOK_ORDERS {
        string id PK
        object customer
        array items
        string school
        string status
        timestamp createdAt
    }

    SETTINGS {
        string id PK
        string key UK
        any value
        timestamp updatedAt
    }

    %% Relationships
    PRODUCTS ||--o{ STOCK_MOVEMENTS : "tracks"
    PRODUCTS ||--o{ SALES : "sold in"
    PRODUCTS }o--|| CATEGORIES : "belongs to"
    PRODUCTS }o--o{ BUNDLES : "included in"

    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ ABANDONED_CARTS : "abandons"

    SALES ||--o| DELIVERY_DRIVERS : "delivered by"
    SALES ||--o{ STOCK_MOVEMENTS : "causes"

    ORDERS ||--o| DELIVERY_DRIVERS : "assigned to"

    SUPPLIERS ||--o{ PRODUCTS : "supplies"