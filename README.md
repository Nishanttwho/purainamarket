# PurainaMarket

PurainaMarket is a MERN-based local grocery and quick-commerce platform for browsing groceries and everyday essentials, managing carts and checkout, placing orders, and coordinating delivery through an admin system and rider workflow.

The current repository contains three application experiences in one full-stack project:

- **Customer storefront** for registration, browsing, cart, checkout, payments, orders, addresses, coupons, and referrals.
- **Admin panel** for products, catalog structure, users, orders, riders, coupons, referrals, delivery areas, store availability, and dashboard reporting.
- **Rider dashboard** for viewing available deliveries, accepting orders, handling assigned orders, collecting COD payments, delivering orders, cancelling eligible orders, and viewing delivery history.

The backend is an Express + MongoDB API. The frontend is a React + Vite single-page application.

> **Repository identity:** This documentation describes the current **PurainaMarket** codebase. Older Blinkit/BlnkIt-clone README instructions are not authoritative for this repository.

---

## Overview

PurainaMarket is designed for a local grocery/quick-commerce use case where a store can publish products, define delivery coverage and delivery charges, control when ordering is available, accept COD or Razorpay payments, and assign orders to riders.

The system is organized around a few core concepts:

1. Customers authenticate and maintain their own profile and addresses.
2. Products belong to categories/subcategories and can be sold either as **packed** units or **loose/open** goods.
3. Checkout pricing is recalculated on the server from the authenticated user's persisted cart and current product data.
4. Coupons and referral rewards are validated and reserved/committed on the server.
5. Delivery charges, free-delivery thresholds, and estimated delivery time are driven by delivery-area configuration.
6. Store availability is checked before order creation.
7. Riders receive and manage delivery orders independently; the old one-active-order-per-rider database index is removed by the server at startup.

---

## Technology Stack

### Frontend

- React 19
- Vite 6
- React Router
- Redux Toolkit / React Redux
- Axios
- Tailwind CSS with the Vite plugin
- Material UI and Emotion
- Radix UI utilities
- Framer Motion
- React Hot Toast
- SweetAlert2
- Swiper
- Lucide React / React Icons
- `@react-oauth/google` for Google Sign-In
- Razorpay checkout integration

### Backend

- Node.js (ES modules)
- Express 4
- MongoDB with Mongoose 8
- JWT authentication
- bcryptjs password hashing
- Google ID-token verification with `google-auth-library`
- Razorpay SDK
- Stripe SDK (legacy server path; not the current customer payment option)
- Cloudinary image storage
- Resend email delivery
- Multer uploads
- Sharp/image-processing dependency
- Helmet security headers
- CORS with configured client-origin allowlisting
- Morgan request logging
- Cookie Parser

---

# Features

## Customer

### Authentication and account

- Customer registration with name, email, mobile number, and password.
- Login by email address or 10-digit mobile number.
- Google Sign-In.
- Email verification after password-based registration.
- Forgot-password flow using an OTP sent through the configured email service.
- Password reset.
- JWT access and refresh tokens.
- Profile updates.
- Profile-avatar upload.
- Active/inactive/suspended account states enforced at login.

### Addresses

- Create, edit, delete, and set a default address.
- Saved addresses are attached to the authenticated customer.
- Address records include recipient name, recipient mobile number, address components, city, state, country, pincode, area, landmark, latitude, and longitude fields.
- Checkout requires an address for actual order creation.

### Catalog

- Category browsing.
- Subcategory browsing.
- Product listing.
- Product details.
- Product search.
- Product filtering by category/subcategory through dedicated API endpoints.
- Published/unpublished product behavior.
- Product stock validation during checkout.

### Cart

- Add items to cart.
- View cart.
- Change packed-product quantities.
- Remove individual items.
- Empty the cart.
- Cart records preserve the product, selling type, loose-purchase mode, selected weight/amount, and a line-price snapshot.

### Product selling types

PurainaMarket currently supports two product selling models:

#### Packed products

Packed products represent fixed-price units such as packaged grocery products.

- Price is stored as the product price.
- Customers purchase an integer quantity.
- Discount, when configured, is applied to the product price before the line total is calculated.

#### Loose/open products

Loose products are configured with a price per kilogram and administrator-controlled purchase options.

Supported configuration in the current product model:

- Price per kg.
- Preset weights, such as `0.25`, `0.5`, `1`, `2`, and `5` kg by default.
- Optional custom-weight purchasing.
- Optional amount-based purchasing.
- Suggested preset rupee amounts.

For amount-based purchasing, the customer chooses a rupee amount. The server calculates the corresponding weight for stock accounting/order data, while the customer-facing purchase mode is amount-based.

### Coupons

- View customer-available coupons.
- Apply a coupon to the cart/checkout flow.
- Remove/clear an applied coupon in the customer checkout UI.
- Coupon savings are returned by the server checkout quote.
- Coupon eligibility and usage limits are enforced server-side.
- Referral reward coupons can appear in the customer's coupon list after a qualifying referral.

### Referrals

- Each customer can have a referral code.
- A shareable referral URL uses the `?ref=...` query parameter.
- The frontend preserves a referral code in session storage when a customer enters through a referral link and then carries it into registration/Google registration.
- The backend validates the referral code and records attribution.
- Self-referral is rejected.
- A referred account cannot be attributed to conflicting inviters.
- Referral rewards are not issued simply because a person registers.
- The reward workflow is tied to a qualifying delivered order and the administrator's referral-reward template configuration.
- Customers can view people they invited, order progress, and earned referral rewards.

### Checkout and orders

- Server-generated checkout quote.
- Subtotal calculation.
- Coupon discount.
- Delivery charge.
- Delivery savings/free-delivery state.
- Handling charge.
- Grand total.
- Delivery area name and estimated delivery time.
- Store-open/order-acceptance check before actual order creation.
- Order history.
- Order details.
- COD checkout.
- Razorpay online checkout.

### Store availability

Customers see the current store/order availability state and a customer-facing message. The store can be manually closed, closed for the remainder of the day, or controlled by future/scheduled ordering periods.

Actual order-creation endpoints enforce the store availability check on the server.

---

## Admin

The admin dashboard is exposed under `/dashboard` and its protected child pages.

### Dashboard

The current dashboard reports data such as:

- Today's order count/revenue-related information.
- Pending orders.
- Active deliveries.
- Orders delivered today.
- Customer count.
- Low-stock products.
- A seven-day order/revenue view.
- Recent orders with customer/rider/address context.

### Catalog management

- Create, update, and delete categories.
- Upload/delete category images.
- Configure category handling fees and whether those fees are enabled.
- Create, update, and delete subcategories.
- Manage subcategory images and category relationships.
- Create, update, and delete products.
- Search/browse products in the admin area.
- Product stock.
- Product publish/status state.
- Product images.
- Product description/unit/discount data.
- Packed versus loose/open selling type.
- Loose price-per-kg and loose purchase configuration.
- Preset weights.
- Custom-weight permission.
- Amount-based purchasing permission.
- Preset amount suggestions.

### Orders

- View all customer orders.
- Open order details.
- View customer, rider, item, delivery-address, payment, coupon, delivery-area, and status information.
- Update order status subject to server-side transition rules.
- Cancel eligible orders with a required cancellation reason.
- Maintain cancellation metadata and order status history.
- Admin cannot directly mark an order as `Delivered`; delivery completion is performed by the assigned rider.

Current admin order transitions are:

```text
Pending         -> Processing | Shipped | Cancelled
Processing      -> Shipped | Cancelled
Shipped         -> Cancelled
Out for Delivery-> Cancelled
Delivered       -> terminal
Cancelled       -> terminal
Returned        -> terminal
```

### Users

- Search customer accounts by name, email, or mobile number.
- Filter customers by `Active`, `Inactive`, or `Suspended` status.
- Paginated customer listing.
- Open customer details.
- Review customer order data, coupons/usage/redemptions, and referral information from the admin user-details view.
- Change customer account status.
- Delete customer accounts.

The general admin user-management API specifically targets users with the `USER` role; riders are managed separately.

### Coupons

Admin coupon management currently supports:

- Create coupons.
- Edit coupons.
- Disable coupons.
- Percentage discounts.
- Fixed discounts.
- Minimum order value.
- Maximum discount.
- Start and expiry dates.
- Active/inactive state.
- Global usage limit.
- Per-user usage limit.
- One-time-use setting.
- Customer targeting through selected eligible users.
- Coupon usage history.
- Referral reward template configuration.
- Referral reward minimum qualifying order value.
- Referral reward validity period.
- Referral reward reason/label.

### Referrals

Admin referral history includes:

- Inviter.
- Referred customer.
- Referral status.
- Latest/qualifying order information.
- Reward coupon information.
- Reward timestamp data.

The admin can configure the referral reward through the coupon-management page by marking a coupon as the referral reward template.

### Delivery areas

Admin can:

- Create delivery areas.
- Enable/disable delivery areas.
- Configure delivery fee per area.
- Configure estimated delivery minutes per area.
- Configure the free-delivery minimum order value per area.
- Update an existing area's settings.

Delivery-area names are unique.

### Store settings

Admin can configure:

- Manual open/closed state.
- Close-for-today time.
- Ordering start date/time.
- Ordering end date/time.
- Custom customer-facing message.
- Multiple scheduled periods with labels, start/end times, open/closed state, and per-period messages.

### Riders

Admin can:

- List riders.
- Create rider accounts.
- Set rider name, email, mobile, and password during creation.

There is no separate admin rider-edit/status-management route in the current rider admin implementation; rider account creation/listing is provided through the dedicated Riders page.

---

## Rider

Riders use the protected `/rider` dashboard and must have the `RIDER` role.

Current rider capabilities include:

- Rider login through the same authentication system with role-based access.
- Rider dashboard.
- View available orders.
- Accept an available order.
- View individual rider order/customer details.
- Manage multiple orders independently.
- Record COD collection for an assigned COD order.
- Mark an assigned order as delivered.
- Cancel eligible orders with a required reason.
- View delivery history.

### Rider order ownership rules

Once a rider accepts an order, the order is assigned to that rider and its status becomes `Out for Delivery`.

For delivery:

- A rider may only collect COD for an order assigned to that rider and currently `Out for Delivery`.
- COD delivery cannot be marked complete until the COD collection has been recorded.
- Non-COD delivery requires confirmed payment.
- A rider can only mark their own assigned active order as delivered.
- Delivery completion records `deliveredAt`.

### Rider cancellation rules

A rider can cancel:

- An assigned `Out for Delivery` order.
- An unassigned `Pending`, `Processing`, or `Shipped` order.

A cancellation reason is mandatory and is stored in the order's cancellation fields/status history.

### Multiple simultaneous orders

The current server explicitly removes the legacy `riderId` unique index at startup. This removes the old one-active-order-per-rider database restriction. Rider order operations are keyed by order ID, so individual orders can be accepted, delivered, or cancelled independently.

The rider controller still contains an old duplicate-index error message mentioning an active-order restriction, but the application startup intentionally drops the legacy unique index. The runtime data model therefore supports multiple simultaneous rider assignments.

---

# Product System

## Packed Product

A packed product uses the product's fixed `price` and an integer quantity. Checkout applies any configured product discount and multiplies the resulting sale price by the requested quantity.

Example:

```text
Product: Rice 5 kg
Selling type: packed
Price: ₹350
Quantity: 2
Line total before other checkout charges: ₹700
```

The example is illustrative only; prices are database-driven.

## Loose/Open Product

A loose product uses `sellingType: "loose"` and a `pricePerKg` value.

The current model stores:

```text
pricePerKg
looseConfig.presetWeightsKg
looseConfig.allowCustomWeight
looseConfig.allowAmount
looseConfig.presetAmounts
```

Loose purchases support two modes:

### Weight mode

- Customer selects an enabled preset weight or, when allowed, a custom weight.
- Server calculates the line price from the sale price per kg.
- Selected weight is stored in cart/order data.

### Amount mode

- Customer selects a rupee amount when amount-based purchasing is enabled.
- Server stores the amount and derives the corresponding weight for stock accounting/order data.
- The customer is purchasing by amount rather than asking the UI to choose a calculated weight.

The cart and order schemas preserve the selling type, purchase mode, selected weight, amount, and line price so the selection is not reconstructed from a changed product price later.

---

# Order + Pricing Logic

## Server-side checkout calculation

Checkout pricing is recalculated on the server from:

- The authenticated user's persisted cart.
- Current product records.
- Current discount settings.
- The selected address/delivery area.
- The selected coupon.

The checkout controllers deliberately do not trust request-supplied item/price totals. This prevents a client from simply changing a product price or total before ordering.

## Pricing flow

For each cart item:

1. Validate that the product still exists and is published.
2. Recalculate the product sale price from the current product data and discount.
3. For packed products, calculate by integer quantity.
4. For loose products, validate the stored weight/amount choice against the current product's loose configuration.
5. Validate required stock amount.
6. Calculate subtotal.
7. Calculate delivery and handling charges.
8. Validate/apply the coupon.
9. Calculate the final amount.

The current total formula is effectively:

```text
Grand Total = Subtotal + Delivery Charge + Handling Charge - Coupon Discount
```

Amounts are rounded to two decimal places by the checkout utility.

## Checkout components

Orders store separate values for:

- Item subtotal (`subTotalAmt`)
- Coupon discount (`couponDiscount`)
- Delivery charge (`deliveryCharge`)
- Delivery savings (`deliverySavings`)
- Free-delivery state (`freeDelivery`)
- Handling charge (`handlingCharge`)
- Combined `otherCharge` value used by the current COD/Razorpay creation flow
- Grand total (`totalAmt`)

## Handling charge logic

Handling fees are configured at the **category** level.

When a cart contains products from multiple categories, the current implementation charges only the **highest enabled handling fee** among the applicable categories:

```text
Handling charge = max(applicable enabled category handling fees)
```

It does **not** sum all category handling fees.

Example:

```text
Category A handling fee: ₹5
Category B handling fee: ₹12
Category C handling fee: disabled

Cart handling charge: ₹12
```

The values above are examples only.

## Delivery fee logic

When an address's `area` matches a configured delivery area, the server uses that area's:

- Delivery fee.
- Free-delivery minimum order value.
- Estimated delivery minutes.
- Enabled/disabled state.

If the configured free-delivery threshold is reached, the delivery charge becomes `₹0` and the saved delivery charge is exposed as delivery savings.

### Current unmatched-area behavior

There is an important implementation detail that should not be confused with a strict delivery-area allowlist:

- A **matched but disabled** delivery area is rejected.
- An address whose area does **not** match any configured delivery-area record is **not currently rejected by the checkout pricing utility**.
- For an unmatched area, the current code falls back to a legacy delivery calculation of `₹30` when subtotal is below `₹500`, otherwise `₹0`.
- Estimated delivery time is `null` when no configured area is matched.

Therefore, the current repository does **not** implement a universal unsupported-area block. Delivery areas are enforced strongly for configured/disabled records, but an unmatched area can still pass through checkout using the fallback pricing logic.

## Delivery time

Delivery time is not a universal hardcoded value. When a delivery area is matched, its `estimatedDeliveryMinutes` value is used and stored on the order.

## Order charge snapshots

When an order is created, the calculated monetary and delivery values are persisted on the order document. The order therefore retains the charge values used at creation instead of depending on future changes to product/category/delivery-area configuration.

---

# Delivery Area System

Delivery areas are database records managed by administrators.

Each area has:

```text
name
 deliveryFee
estimatedDeliveryMinutes
freeDeliveryMinimumOrderValue
isEnabled
```

The customer address contains an `area` field. Checkout resolves that area against the configured delivery-area records using a case-insensitive exact-name match.

### Normal flow

```text
Customer address
      |
      v
Address.area
      |
      v
Match configured delivery area
      |
      +--> disabled -> checkout rejected
      |
      +--> enabled -> fee/time/threshold applied
```

Areas such as `Deoria` or `Salempur` can be configured as normal database records, but these names are not hardcoded into the application.

---

# Store Availability

Store availability is managed through a dedicated settings record.

Supported controls include:

- Manual open/closed state.
- Close for today until a specified timestamp.
- Future ordering start timestamp.
- Ordering end timestamp.
- Custom customer-facing message.
- Multiple scheduled periods.
- Each scheduled period can define its own label, start time, end time, open/closed state, and message.

## Availability precedence

The backend evaluates availability in this general order:

1. A future `closedTodayUntil` forces the store closed.
2. A future `orderingStartsAt` keeps ordering closed until that time.
3. A reached `orderingEndsAt` closes ordering.
4. An active schedule period can override open/closed state and message.
5. Otherwise the manual open/closed setting controls the store.

A public store-status endpoint exposes the current state for the customer storefront.

## Ordering restriction

The server calls the store-availability guard before creating COD, Razorpay, and legacy Stripe checkout orders. If ordering is closed, the request is rejected with a store-closed response instead of creating the order.

The frontend also disables the checkout action when store availability reports that ordering is unavailable.

---

# Coupon System

Coupons are database records with server-side validation.

Supported coupon properties include:

- Code.
- Percentage or fixed discount.
- Minimum order value.
- Maximum discount.
- Start date/time.
- Expiry date/time.
- Active/inactive state.
- Global usage limit.
- Per-user usage limit.
- One-time-use behavior.
- Targeted users.
- Referral-reward template flag.
- Referral-reward minimum qualifying order value.
- Reward validity period.
- Referral reward source metadata.

## Coupon calculation

Percentage discounts are calculated from the order subtotal and capped by `maximumDiscount` when configured.

Fixed discounts are applied as a rupee amount but cannot reduce the subtotal below zero.

## Coupon validation

The server rejects coupons when, for example:

- The code does not exist.
- The coupon is inactive.
- The coupon has not started.
- The coupon has expired.
- The coupon is reserved for referral-template use.
- The customer is not an eligible targeted user.
- The subtotal is below the minimum order value.
- The global usage limit has been reached.
- The customer's own usage limit has been reached.

## Usage reservation

For an actual order, the backend reserves coupon usage before completing the payment/order flow and either commits or releases that reservation depending on the result. This prevents simple concurrent order requests from bypassing usage limits.

Coupon usage and redemption information is retained in dedicated coupon-usage/redemption collections and exposed to administrators.

---

# Referral System

The referral system links a referring customer to a referred customer at registration time.

## Referral flow

```text
Customer shares referral link
        |
        v
/?ref=REFERRAL_CODE
        |
        v
Frontend stores pending referral code
        |
        v
Customer registers / uses Google Sign-In
        |
        v
Backend validates inviter
        |
        v
Referral attribution record is created
        |
        v
Referred customer places an order
        |
        v
Order becomes Delivered
        |
        v
Referral reward template + threshold checked
        |
        v
One-time reward coupon issued to inviter
```

## Attribution protections

The backend protects attribution by:

- Normalizing referral codes.
- Accepting only valid referral-code characters/lengths.
- Finding an active `USER` account as the inviter.
- Rejecting self-referrals.
- Preventing conflicting duplicate referral attribution for a referred account.

## Reward qualification

Registration alone does not issue the referral reward.

The reward is considered when a referred customer's order is marked `Delivered`. The active referral reward template is checked, including its `referralMinimumOrderValue`.

When the qualifying conditions are met:

- The inviter receives a generated one-time referral coupon.
- The reward coupon is tied to the source referral and qualifying order.
- The referral changes from `Pending` to `Rewarded`.
- The reward coupon receives the configured discount/eligibility settings from the template.
- The reward coupon expires after the configured `rewardValidityDays`.

---

# Order Cancellation

## Admin cancellation

Admin order status updates support cancellation from the statuses permitted by the server transition table. A cancellation requires a reason.

The order stores:

- `cancellationReason`
- `cancelledAt`
- `cancelledBy`
- A `statusHistory` entry containing the cancellation reason and actor.

Coupon reservations are released when an eligible cancelled/returned order has an attached coupon reservation.

## Rider cancellation

Riders must provide a cancellation reason.

A rider can cancel:

- Their own assigned `Out for Delivery` order.
- An unassigned `Pending`, `Processing`, or `Shipped` order.

This means the current implementation does allow a rider to cancel an eligible unassigned early-stage order; it is not restricted only to orders already assigned to that rider.

## Customer cancellation

There is no customer-facing order-cancellation API in the current route set. The current cancellation actors are admin and rider.

---

# Rider Multi-Order System

The rider system is intentionally independent per order.

An accepted order stores the rider ID and acceptance time and moves to `Out for Delivery`.

Multiple orders can be assigned to the same rider because the server startup removes the legacy unique `riderId` index from the order collection. Operations such as accept, cancel, collect COD, and deliver are always performed against a specific order ID and rider identity.

This allows a rider to:

- Hold multiple active orders.
- View/manage each order separately.
- Collect COD for one order without changing another order.
- Deliver one order without automatically delivering other orders.
- Cancel one eligible order without cancelling the rest.

---

# Payments

## Current customer payment methods

The current customer checkout UI exposes exactly two payment methods:

1. **Cash on Delivery (COD)**
2. **Razorpay online payment**

Stripe is **not** a current customer checkout option.

## Cash on Delivery

COD orders are created directly by the backend after the server recalculates checkout charges and verifies store availability.

New COD orders use:

```text
payment_type: Cash on Delivery
paymentStatus: COD Pending
```

When the assigned rider collects the cash, the backend changes the payment state to `COD Collected`. Delivery completion then requires the COD collection state to be satisfied.

## Razorpay

The Razorpay flow uses:

- Client-side Razorpay checkout with the public key ID.
- Server-side order creation based on the server-generated checkout total.
- Razorpay signature verification using the server secret.
- Retrieval of the gateway order/payment after signature verification.
- Validation that the payment/order IDs match.
- Validation that the payment is captured.
- Validation of expected amount and currency.

A real or test Razorpay account is therefore required for online payment testing.

Never expose the Razorpay secret key in the client application or commit it to Git.

## Stripe legacy code

Stripe dependencies and server checkout/webhook code still exist in the repository, including a Stripe payment enum value and legacy API route.

However:

- The current customer checkout page does not present Stripe.
- Current customer payment documentation is intentionally limited to COD and Razorpay.
- `STRIPE_SECRET_KEY` is not required by the current COD/Razorpay checkout flow.
- Treat Stripe as **legacy/inactive customer payment code** unless the application is deliberately reactivated and tested for Stripe.

The old `VITE_STRIPE_PUBLISHABLE_KEY` configuration is not part of the current supported frontend environment configuration.

---

# Authentication

PurainaMarket uses JWT-based authentication with three application roles:

```text
USER
ADMIN
RIDER
```

## Customer authentication

Password-based registration/login uses the customer `USER` role by default.

Google Sign-In creates/uses a customer account with the `USER` role.

The server verifies Google ID tokens against `GOOGLE_CLIENT_ID` and checks issuer, audience, timestamps, and verified-email state.

## JWT behavior

The backend generates:

- Access token: 5-hour expiry.
- Refresh token: 7-day expiry.

The access and refresh tokens are issued using secure HTTP-only cookies with `sameSite: "None"` and `secure: true`.

The authentication middleware also accepts an access token from the `Authorization: Bearer <token>` header. The current frontend attaches the access token from its client-side auth state to requests and uses the refresh-token endpoint when an access token expires.

## Role protection

The backend uses a dedicated role middleware. Routes requiring a role check query the authenticated user's current role before continuing.

The frontend also protects the admin and rider route trees with role-aware protected routes, but frontend route protection is not treated as the security boundary—the backend performs the actual authorization check as well.

---

# Creating an Admin

An administrator is created by the server-side interactive script.

From the repository root:

```bash
cd server
npm run create-admin
```

The script loads `server/.env`, connects to MongoDB, and prompts for:

1. Admin name.
2. Admin email.
3. Mobile number.
4. Admin password.
5. Password confirmation.

Password input is hidden in an interactive terminal.

The script:

- Requires `MONGODB_URI`.
- Verifies MongoDB connectivity.
- Refuses to create another admin if an `ADMIN` account already exists.
- Validates the email address.
- Validates a digits-only mobile number that fits the numeric user model field.
- Refuses to change an existing user's role into an admin.
- Hashes the password with bcryptjs.
- Creates the account with `role: "ADMIN"`.

There are no documented default/demo admin credentials in the current setup.

---

# Rider Creation

Riders are created by an authenticated admin from the admin dashboard.

Frontend route:

```text
/dashboard/riders
```

Backend API:

```text
POST /api/order/admin/riders
```

The admin supplies:

- Name.
- Email.
- 10-digit mobile number.
- Password of at least 8 characters.

The created account receives:

```text
role: RIDER
```

Riders then use the regular authentication system and are allowed into the `/rider` application area only when their role is `RIDER`.

Riders cannot access admin-only catalog, user, coupon, referral, delivery-area, or store-settings routes.

---

# Demo Data / Seed Script

The repository contains:

```text
server/scripts/seed-demo-data.js
```

It is intended for development/testing of the order flow.

## What it creates

The seed creates, when needed:

- `Demo Category`
- `Demo Subcategory`
- `Demo Product`

The demo product is:

- Packed (`sellingType: "packed"`).
- Price ₹100.
- Stock 100.
- Unit `piece`.
- Published.
- Marked with a PurainaMarket demo seed ID.
- Given a placeholder image URL.

Category and subcategory also use placeholder images.

## Run the seed

```bash
cd server
node scripts/seed-demo-data.js
```

The script is intentionally conservative:

- Existing matching demo data is not rewritten.
- A conflicting product/category/subcategory situation causes the script to stop instead of overwriting unrelated data.
- Records created during a failed run are rolled back by the script.

## Remove seeded data

```bash
cd server
node scripts/seed-demo-data.js --remove
```

Removal is also guarded:

- The demo product is not removed if it is referenced by an order or cart.
- The demo subcategory is removed only when no products still reference it.
- The demo category is removed only when no products/subcategories still reference it.
- If the demo product cannot be found, no records are changed.

Do not use this seed as a production-data management tool.

---

# Cloudinary

Cloudinary is used for image storage in the current backend image/upload utilities.

Current uses include:

- Product/category/subcategory image upload flows.
- Customer avatar uploads.
- Image deletion when replacing/removing managed images.

The backend requires these server environment variables for Cloudinary-backed uploads:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Do not commit these credentials.

The demo seed script does not require Cloudinary to create its demo product/category/subcategory because it uses public placeholder image URLs.

---

# Google Sign-In

The current Google authentication flow uses Google's popup ID-token flow through `@react-oauth/google` on the client and `google-auth-library` on the server.

## Required configuration

The same Google Web OAuth Client ID is used in both:

```text
server/.env
GOOGLE_CLIENT_ID=...
```

and:

```text
client/.env
VITE_GOOGLE_CLIENT_ID=...
```

## Google Cloud configuration

Create an OAuth client of type **Web application** in Google Cloud Console.

For local development, add the origins you actually use, typically:

```text
http://localhost:5173
http://127.0.0.1:5173
```

For production, add the exact production website origin used by the deployed frontend.

The current flow does not require a redirect callback URL or browser-side client secret for the popup ID-token exchange.

The backend verifies:

- Google issuer.
- Audience against `GOOGLE_CLIENT_ID`.
- Token expiry.
- Token issue time sanity.
- Verified email state.
- Google subject identifier.

Never put a Google client secret in the frontend `.env`.

---

# Environment Configuration

PurainaMarket uses separate environment files for the server and client.

```text
PurainaMarket/
├── client/
│   └── .env
└── server/
    └── .env
```

## Server environment

Create:

```text
server/.env
```

Recommended template:

```dotenv
# Server
PORT=8080
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/purainamarket

# Authentication
SECRET_KEY_ACCESS_TOKEN=replace-with-a-long-random-secret
SECRET_KEY_REFRESH_TOKEN=replace-with-a-different-long-random-secret

# Email (required by the current email helper)
RESEND_API_KEY=replace-with-your-resend-api-key

# Google Sign-In
GOOGLE_CLIENT_ID=replace-with-your-google-web-client-id

# Cloudinary (needed for real image/avatar uploads)
CLOUDINARY_CLOUD_NAME=replace-with-your-cloudinary-cloud-name
CLOUDINARY_API_KEY=replace-with-your-cloudinary-api-key
CLOUDINARY_API_SECRET=replace-with-your-cloudinary-api-secret

# Razorpay
RAZORPAY_ID_KEY=replace-with-your-razorpay-key-id
RAZORPAY_SECRET_KEY=replace-with-your-razorpay-key-secret
```

### Server variables

| Variable | Current role | Required? |
| --- | --- | --- |
| `PORT` | Backend listening port; defaults to `8080` when omitted | Optional |
| `CLIENT_URL` | CORS allowlist/origin and verification-link base URL | Required for normal frontend operation |
| `MONGODB_URI` | MongoDB connection string | Required |
| `SECRET_KEY_ACCESS_TOKEN` | JWT access-token signing secret | Required for authentication |
| `SECRET_KEY_REFRESH_TOKEN` | JWT refresh-token signing secret | Required for refresh tokens |
| `RESEND_API_KEY` | Email sending for verification/password-reset flows | Required by the current email helper |
| `GOOGLE_CLIENT_ID` | Server-side Google ID-token audience verification | Required for Google Sign-In |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name | Required for Cloudinary uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Required for Cloudinary uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Required for Cloudinary uploads |
| `RAZORPAY_ID_KEY` | Razorpay API key ID / checkout integration | Required for Razorpay |
| `RAZORPAY_SECRET_KEY` | Razorpay server secret and signature verification | Required for Razorpay |

### Legacy server variable

```text
STRIPE_SECRET_KEY
```

The current repository still contains Stripe configuration and server checkout/webhook code, so the variable is still technically read by legacy server code. It is **not part of the current supported customer payment configuration**, and the current checkout UI uses COD + Razorpay only.

`STRIPE_WEBHOOK_SECRET_KEY` is not referenced by the current audited source and should not be added to a new environment file.

## Client environment

Create:

```text
client/.env
```

Use:

```dotenv
# Backend API base URL
VITE_API_URL=http://localhost:8080

# Google Web OAuth Client ID
VITE_GOOGLE_CLIENT_ID=replace-with-your-google-web-client-id

# Razorpay public key ID
VITE_RAZORPAY_ID_KEY=replace-with-your-razorpay-key-id
```

### Client variables

| Variable | Current role | Required? |
| --- | --- | --- |
| `VITE_API_URL` | Base URL used by the Axios API client | Required |
| `VITE_GOOGLE_CLIENT_ID` | Google Sign-In frontend client ID | Required for Google Sign-In |
| `VITE_RAZORPAY_ID_KEY` | Razorpay checkout public key ID | Required for Razorpay online checkout |

### Unused/deprecated client variables from older documentation

These older variables are not part of the current supported client environment configuration:

```text
VITE_GOOGLE_API_KEY
VITE_STRIPE_PUBLISHABLE_KEY
```

Do not add them unless the application code is deliberately changed to use them.

## Environment-file rules

- Never commit real `.env` files.
- `.gitignore` already excludes `.env`, `.env.*`, `server/.env`, and `client/.env`.
- `.env.example` files contain placeholders only and are safe to commit when they contain no secrets.
- Production secret values should be entered through the deployment platform's environment-variable/secrets system.

---

# Installation

## Prerequisites

Use a current Node.js LTS release compatible with the project dependencies and npm.

You also need:

- MongoDB locally or MongoDB Atlas.
- A Resend API key for the current email helper.
- Google OAuth credentials if Google Sign-In is enabled.
- Razorpay test/live credentials to exercise online payments.
- Cloudinary credentials to exercise real image/avatar uploads.

## Clone

```bash
git clone https://github.com/Nishanttwho/purainamarket.git
cd purainamarket
```

## Install the server

```bash
cd server
npm install
```

## Install the client

From the repository root:

```bash
cd ../client
npm install
```

## Configure the environment

Create:

```text
server/.env
client/.env
```

Use the templates described in [Environment Configuration](#environment-configuration).

## Configure MongoDB

Set `MONGODB_URI` in `server/.env` to the MongoDB instance/database you want the application to use.

The backend will refuse to start when `MONGODB_URI` is missing.

## Start the backend

Development:

```bash
cd server
npm run dev
```

Production-style Node start:

```bash
cd server
npm start
```

The backend listens on `PORT`, defaulting to:

```text
http://localhost:8080
```

The root health response is available at:

```text
GET /
```

## Start the frontend

```bash
cd client
npm run dev
```

The Vite client normally starts at:

```text
http://localhost:5173
```

Because the Vite config does not hardcode a port, use the port printed by Vite if another port is selected.

---

# Testing and Validation

The current package scripts are intentionally simple.

## Server scripts

`server/package.json` currently provides:

```bash
npm start
npm run dev
npm run create-admin
```

There is no `npm test` script in the current server package.

## Client scripts

`client/package.json` currently provides:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### Production build check

```bash
cd client
npm run build
```

### Lint

```bash
cd client
npm run lint
```

### Preview a production build locally

```bash
cd client
npm run preview
```

There is no automated frontend test command exposed by the current `client/package.json` scripts.

---

# Project Structure

The repository is a two-application MERN project rather than a monorepo with a root package script.

```text
PurainaMarket/
├── client/
│   ├── public/                 # Public/static frontend assets
│   ├── src/
│   │   ├── assets/             # Brand/static frontend assets
│   │   ├── common/             # Shared API endpoint definitions
│   │   ├── components/         # Shared UI and protected-route components
│   │   ├── layout/             # Customer/admin/rider layouts
│   │   ├── pages/              # Storefront, admin, and rider pages
│   │   ├── provider/           # Cart/address/store-availability contexts
│   │   ├── routes/             # React Router configuration
│   │   ├── store/               # Redux slices/store
│   │   ├── utils/               # Axios, referral/auth helpers, etc.
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/                 # DB/Google/Stripe configuration
│   ├── controllers/            # API business logic
│   ├── helper/                 # Password/email helpers
│   ├── middleware/             # Auth, role, multipart upload middleware
│   ├── models/                 # Mongoose models/schemas
│   ├── routes/                 # Express API routes
│   ├── scripts/                # Admin creation and demo-data scripts
│   ├── utils/                  # Pricing, coupons, referrals, payments, availability, images
│   ├── index.js                # Express server entry point
│   └── package.json
│
├── .gitignore
└── README.md
```

### Important backend route groups

The current server mounts:

```text
/api/user
/api/file
/api/category
/api/sub-category
/api/product
/api/cart
/api/address
/api/order
/api/coupon
/api/store
/api/referral
/api/delivery-areas
```

---

# Security

The current implementation includes several meaningful security controls.

## Authentication and authorization

- Passwords are hashed using bcryptjs.
- JWT access and refresh tokens are signed with separate server-side secrets.
- The authentication middleware verifies access tokens server-side.
- Role middleware enforces `ADMIN`, `RIDER`, and `USER` access on protected APIs.
- Admin/rider frontend routes are also protected at the router level.
- Admin-only API routes perform server-side role checks.

## Checkout integrity

- Checkout recalculates prices from database records and the user's persisted cart.
- Request-provided item totals are not trusted by the order calculation.
- Coupon eligibility and usage are checked server-side.
- Address ownership is verified against the authenticated user.
- Product publication status is checked before checkout.
- Product stock is validated before checkout.
- Store availability is checked before order creation.

## Razorpay verification

Razorpay payment verification uses:

- HMAC SHA-256 signature verification.
- Timing-safe signature comparison.
- Gateway order/payment retrieval.
- Order/payment ID consistency checks.
- Captured-status verification.
- Amount and currency matching.

## HTTP/security middleware

The server currently uses:

- Helmet.
- CORS origin allowlisting based on `CLIENT_URL`.
- HTTP-only cookies for JWT tokens.
- Cookie parsing.
- Request logging through Morgan.

## Secret management

API keys/secrets are read from environment variables. Real credentials should never be placed in source files, documentation, public examples, or client code unless they are explicitly public credentials intended for browser use.

---

# Troubleshooting

## `MONGODB_URI` missing

Error messages explicitly indicate that `MONGODB_URI` must be provided.

Check:

```text
server/.env
```

and confirm:

```dotenv
MONGODB_URI=...
```

Also verify that the MongoDB service/Atlas cluster is reachable from the machine running the server.

## Backend does not start

Check the server terminal first.

Common current-project causes include:

- Missing `MONGODB_URI`.
- Invalid MongoDB connection string.
- Missing `RESEND_API_KEY` (the current email helper fails fast when it is missing).
- Invalid/missing payment configuration when exercising payment-related code.
- Port `8080` already being used.

Use:

```bash
cd server
npm run dev
```

and read the first configuration/connection error rather than changing application code blindly.

## Frontend cannot reach backend

Verify:

```dotenv
VITE_API_URL=http://localhost:8080
```

in `client/.env` and make sure the backend is actually listening on that port.

Also verify `CLIENT_URL` on the server matches the frontend origin, for example:

```dotenv
CLIENT_URL=http://localhost:5173
```

The backend configures CORS with credentials and allows the configured origin plus its localhost/127.0.0.1 counterpart when applicable.

## Google Sign-In fails

Check all of the following:

1. `VITE_GOOGLE_CLIENT_ID` exists in `client/.env`.
2. `GOOGLE_CLIENT_ID` exists in `server/.env`.
3. Both values refer to the same Google Web OAuth client.
4. The exact frontend origin is listed as an authorized JavaScript origin in Google Cloud Console.
5. Production uses the production frontend origin rather than the local origin.

## Razorpay checkout fails

Verify:

```text
VITE_RAZORPAY_ID_KEY
RAZORPAY_ID_KEY
RAZORPAY_SECRET_KEY
```

Also make sure the browser can load the Razorpay checkout script and the backend can create/fetch Razorpay orders.

## Cloudinary image upload fails

Check:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

The demo seed itself uses placeholder image URLs and therefore does not need Cloudinary credentials.

## Email verification/password reset fails

The current email helper requires:

```text
RESEND_API_KEY
```

The sender address is currently defined in application code rather than an environment variable. Production email delivery therefore also depends on the current sender/domain configuration in the source.

## Port conflict

Backend:

```dotenv
PORT=8080
```

Client: Vite chooses the available development port; the client application should use whatever URL/port Vite reports, and `VITE_API_URL`/`CLIENT_URL` must match the actual frontend/backend origins.

## Demo data is already present

Running:

```bash
node scripts/seed-demo-data.js
```

is intentionally idempotent for its own demo records. It does not overwrite unrelated records.

To remove the demo data:

```bash
node scripts/seed-demo-data.js --remove
```

The remove operation refuses to delete the demo product while an order/cart still references it.

---

# Production / Deployment Notes

PurainaMarket can be deployed as separate frontend and backend applications. The repository does not require a specific hosting platform.

## Backend

Deploy the `server/` application as a Node.js service using its existing package scripts:

```bash
npm install
npm start
```

Set all required server environment variables in the deployment provider rather than committing them.

## Frontend

Build the `client/` application with:

```bash
npm install
npm run build
```

Serve the resulting Vite build using your chosen static-hosting/CDN platform.

Set:

```text
VITE_API_URL
VITE_GOOGLE_CLIENT_ID
VITE_RAZORPAY_ID_KEY
```

for the deployment environment before building.

## MongoDB Atlas

MongoDB Atlas is suitable for the production database because the server only requires a MongoDB connection string through `MONGODB_URI`.

Ensure:

- The deployment IP/network is permitted by the Atlas configuration.
- The database user has the required permissions.
- The connection string is stored only as a secret.

## Cloudinary

Configure the three Cloudinary server variables before using real product/category/avatar uploads.

## Razorpay

Use the appropriate test/live credentials for the environment.

Do not put `RAZORPAY_SECRET_KEY` in the frontend environment.

Only the public Razorpay key ID belongs in the client environment.

## Google OAuth in production

Add the exact production frontend origin as an authorized JavaScript origin for the Google Web OAuth client.

The client and server must continue using the same OAuth client ID:

```text
VITE_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_ID
```

## HTTPS and cookies

The current JWT cookies use `secure: true` and `sameSite: "None"`. A production deployment should therefore use HTTPS and a correctly configured cross-origin frontend/backend arrangement.

## CORS and frontend URL

Set:

```text
CLIENT_URL=<actual frontend origin>
```

The backend uses this value to build its allowed CORS origins and to construct email verification links.

## Secret management

Use the deployment platform's encrypted secret/environment-variable system for:

- MongoDB credentials.
- JWT secrets.
- Resend key.
- Cloudinary credentials.
- Razorpay secret.
- Google server configuration values that should remain server-side.

Never copy development `.env` files into a public repository or deployment artifact.

---

# Current Limitations / Notes

These points describe current code behavior rather than planned features.

1. **Unmatched delivery areas are not hard-blocked.** A matched disabled area is rejected, but an area with no matching delivery-area record can currently use a legacy fallback delivery charge of ₹30 below ₹500 or ₹0 at/above ₹500.
2. **Razorpay and COD are the supported customer checkout methods.** Stripe code remains in the repository as legacy server code but is not presented by the current checkout UI.
3. **Cloudinary is required for actual managed image uploads.** The demo seed can operate with public placeholder images instead.
4. **Email configuration is currently code-assisted.** `RESEND_API_KEY` is required by the email helper, while the sender address is defined in source rather than as an environment variable.
5. **No automated server test command is defined.** Server `package.json` exposes `start`, `dev`, and `create-admin`; client `package.json` exposes `dev`, `build`, `lint`, and `preview`.
6. **Rider account management is intentionally narrow in the current admin UI.** Admins can list and create riders, while general customer status management is handled by the separate user-management area.
7. **Stripe environment/configuration is legacy.** `STRIPE_SECRET_KEY` is still read by the legacy server Stripe configuration; it is not needed for current COD/Razorpay checkout.

---

# Development Workflow Summary

A typical local development session is:

```bash
# Terminal 1
cd purainamarket/server
npm install
npm run dev

# Terminal 2
cd purainamarket/client
npm install
npm run dev
```

Then:

1. Create/configure `server/.env` and `client/.env`.
2. Verify MongoDB connectivity.
3. Create an admin with `npm run create-admin`.
4. Sign in to the admin dashboard.
5. Optionally run the demo seed script.
6. Configure categories/subcategories/products.
7. Configure delivery areas and store availability.
8. Create riders.
9. Configure coupons/referral reward template.
10. Test a customer order using COD or Razorpay.
11. Sign in as a rider and exercise acceptance, COD collection, delivery, cancellation, and history flows.

---

# Current API Surface

The backend currently mounts these API groups:

| Prefix | Main responsibility |
| --- | --- |
| `/api/user` | Customer auth, Google login, profile, password recovery, referrals, admin user management |
| `/api/file` | Admin image upload/delete |
| `/api/category` | Categories |
| `/api/sub-category` | Subcategories |
| `/api/product` | Product CRUD, search, category browsing |
| `/api/cart` | Authenticated customer cart |
| `/api/address` | Customer saved addresses |
| `/api/order` | Checkout quote, customer orders, payment flows, admin orders, rider workflow, admin dashboard/riders |
| `/api/coupon` | Customer coupon validation/listing and admin coupon management |
| `/api/store` | Public store status and admin store settings |
| `/api/referral` | Admin referral history |
| `/api/delivery-areas` | Customer active-area listing and admin delivery-area management |

The application uses protected role-aware endpoints rather than trusting frontend navigation alone.

---

# License / Repository Notes

The repository currently contains the application code and documentation described above. Consult the repository files themselves for the definitive implementation when behavior changes.

For future changes, update this README and the `.env.example` templates whenever a new user-facing capability, environment variable, script, payment method, or deployment requirement is actually introduced in code.
