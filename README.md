# humunJS

the "official" humun client library.

humunJS contains all of the integrations and functions you will need to call from the client side.

All async functions are promisified.

## humun site basics

A humun site must contain all elements for an end-to-end experience.

This includes:

- item display
    - optional: pagination
- customer information form (name, email, address, etc)
- payment capture form

## humunJS concepts

humunJS aims to offload all of the business logic from individual sites so that they can focus on creative expression rather than rote ecommerce code.

humun is Multi-Tenant. Tenancy is controlled with a `x-tenant-id` through the [API](https://humun.us/api). Client side, this is handled through `Humun.tenantID` which can be set with `Humun.Tenant("tenant-id-here")`. Initializing an API client with no tenant specified will default to span all tenants in the platform.

## Getting Started

Import humunJS into your client:

```html
<script src="https://humun.us/js/humun-v0.0.2.js"></script>
```

In your application's corresponding `mounted()` function, initialize your tenant:

```js
// tenant ID: optional. default: all.
let humunTenant = '';
// container: optional. DOM container which contains all humun elements. default: body.
let container = document.querySelector('.humun-slim')
// initialize client and get first 100 items
Humun.Init(humunTenant, container);
```

The above is the bare minimum required. However for more in-depth integrations, you may find it useful to use some of the helper functions provided.

**Overriding default Stripe form styling**

You can retrieve the default Stripe form styling through `Humun.payment.stripeStyle`. You can override this when initializing your client:

```js
Humun.Tenant("your-tenant-id-here")
Humun.payment.stripeStyle = {
    fonts: [
        {
            cssSrc: 'https://fonts.googleapis.com/css2?family=Poiret+One&display=swap',
        }
    ],
    base: {
        color: "#32325d",
        fontFamily: 'Poiret One, sans-serif',
        fontSmoothing: "antialiased",
        fontSize: "16px",
        "::placeholder": {
        color: "#32325d"
        }
    },
    invalid: {
        fontFamily: 'Poiret One, sans-serif',
        color: "#fa755a",
        iconColor: "#fa755a"
    }
}
Humun.Init()
```

**Hooking in to state changes**

As humunJS is framework agnostic, it does not natively tie in with Vue, React, or Angular event hooks.

While this is something a native JS event bus would probably handle more eloquently, as it is currently implemented, humunJS exposes a `Humun.StateFx` function which the client can set. humunJS will call the `StateFx` with the updated state on any changes.

```js
function stateFx(status) {
    console.log("The new state is: ", status.state)
    if (status.state == "checkout-complete") {
        displayThankYouPage();
    }
    if (status.loading) {
        showLoading();
    }
    if (!status.loading) {
        hideLoading();
    }
    if (status.error) {
        setErrorMessage(status.error);
    }
}
Humun.Tenant('tenant-id')
Humun.StateFx = stateFx
Humun.Init()

```

You will also find it useful to extend your framework to access data from humunJS:

```js
Vue.prototype.Humun = Humun
```

## Bare Styling

`slim.html` shows an example of a completely unstyled humun shop. Feel free to copy / paste these elements and style as necessary.

## Magic DOM

For quick building capabilities, humun supports an auto-filling "magic DOM".

If your DOM contains the following:

```html
<div id="humun-magic"></div>
```

Then a full slim humun site will be injected, which you can then style accordingly. You can see this in `magic.html`.

## Integrations Functions Overview

The complete humunJS library is just slightly over 500 LOC - the code should be able to speak for itself. However the following is an overview of the most basic functions that an integration will require.

### Humun.getItems(page, pageSize)

Returns the currently available items for the tenant. Will update the internal `Humun.items` array, as well as resolve the same list of items.

```js
let displayItem;
Humun.getItems(1, 100)
    .then(response => {
        displayItem = response.data[0]
        // which is the same as
        displayItem = Humun.items[0];
    })
    .catch(error => {
        console.log(error);
    });
```

### Humun.addToCheckout(item)

`Humun.addToCheckout` is a convenience function which wraps the following steps:
- add the product to the `Humun.checkoutItem` cart
- set the `Humun.orderRequest.payment_type` to `card`
- call `Humun.stripePaymentIntent()` to initialize a card payment
- if `#card-element` exists, call `Humun.initcard()` to initialize the Stripe card client

```js
Humun.addToCheckout(item)
    .then(function (res) {
        // show check out page
    }.bind(this))
    .catch(error => {
        console.log(error)
    })
```

### Humun.initcard()

If a product is added to the cart before `#card-element` is in the DOM, you will need to call `Humun.initcard()` after making the `#card-element` available in the DOM. See below for an example of the full stripe payment form.

```js
function showCheckoutPage() {
    document.querySelector("#card-element").style.display = "block";
    Humun.initcard();
}
showCheckoutPage();
```

### Humun.setCardPayment()

Set the payment type to `card` and initialize a Stripe payment intent.

```js
Humun.setCardPayment()
```

### Humun.setCryptoPayment()

Set the payment type to `crypto` and return the crypto receiving addresses. This will also start polling the crypto payment check API. When the payment has been received on the crypto network, this will process the order and finish with state `checkout-complete`. In the interim, the status will remain in `payment-pending`.

For this reason, you should probably ensure that you have collected the customer information before displaying the crypto address - if the customer sends payment before they have entered their information, the order will not process properly while their payment will have been processed, and that will lead to customer support questions.

```js
Humun.setCryptoPayment()
```

If the customer backs out of the checkout process, or decides to switch to card payment, you can stop the crypto payment check with:

```js
Humun.StopCryptoCheck()
```

### Humun.submitStripePayment(event)

Attach to the stripe payment form which wraps around `<div id="card-element"></div>`. On trigger, this will confirm the stripe payment, create the order, and resolve the final order details with the state `checkout-complete`.

```html
<div class="payment-input card" v-if="payment_type == 'card'">
    <form id="payment-form" @submit="Humun.submitStripePayment">
        <div id="card-element"></div>
        <button id="submit">
            <span id="button-text" >pay now</span>
        </button>
    </form>
</div>
```

### Humun.getWeb3Accounts()

Checks if the user has a supported ethereum client installed and if so, attempts to retrieve the first available address (per current Metamask API spec). If a value is returned, it will be set to `Humun.checkout.EthAddress`. If `#recipient-eth-addr` input exists, the value will also be set so the customer is aware what address will be receiving the NFT. This should only be called at checkout if the current product is an NFT.

```js
Humun.getWeb3Accounts()
```

## Data Functions Overview

The following functions can be called as part of reactive UIs to inject the respective data.

### Humun.crypto_pricing()

Returns the crypto pricing for the selected product for checkout. Will only return data after calling `Humun.setCryptoPayment()`.

```html
<div class="crypto-prices">
    <div class="crypto-price" v-for="a, k in Humun.crypto_pricing()">
        {{a.currency}}: {{a.amount}}
    </div>
</div>
```

### Humun.crypto_addresses()

Returns the available receive addresses for a crypto checkout. Will only return data after calling `Humun.setCryptoPayment()`.

```html
<div class="crypto-address-list">
    <div class="crypto-address" v-for="a, k in Humun.crypto_addresses()">{{k}}<br>{{a}}</div>
</div>
```

### Humun.ethEnabled()

Returns Boolean `true` if the user's browser has a supported ethereum client installed.

## Data

To reduce integration requirements, humunJS contains product, checkout, and order state internally. The following data is pertinent when integrating.

### Humun.items

**Type** `[]product.Product`

API Schema: https://humun.us/api/v1/docs/swagger/#/products/HandleListProducts

Populated by `Humun.getItems(page int, pageSize int)`

### Humun.checkoutItem

**Type** `product.Product`

Set a `Humun.item[*]` to `Humun.checkoutItem` before initiating a checkout on the item with `Humun.addToCheckout(item)` - this is effectively the "cart". NOTE: currently we only support single-item checkout, simply to reduce front end complexity of cart managment. However we will be adding full cart support. The backend APIs already have full support for multi-product purchase, we just need to extend this client library. 

### Humun.checkout

**Type** `customer.Customer`

Set this object to the customer's details as part of the checkout process. This is the customer's contact and shipping information.

API Schema: https://humun.us/api/v1/docs/swagger/#model-Customer

### Humun.status

**Type** `Object`

Internal status object for humunJS. This is the same object that is passed in to `StateFx` on state changes.

```js
{
    state: "string",
    loading: Boolean,
    error: Error
}
```

### Humun.apiBase

**Type** `String`

Defaults to `https://humun.us/api/v1`, can be overridden for development.

## High Level Process

- initialize Humun client
- Humun.getItems(), display to user
- on user select Humun.items[*], Humun.addToCheckout(item) and show them checkout page
- on checkout page collect user information and set to Humun.checkout
    - if using card, Humun.setCardPayment()
        - This will create a payment intent which will enable the user to process a payment with the Stripe.js library
    - if using crypto, Humun.setCryptoPayment()
        - This will populate the crypto prices and addresses, which are accessible through `Humun.crypto_pricing()` and `Humun.crypto_addresses()` which should be displayed to the user
        - this will start polling all supported blockchains for payments received on customer receive address
- For both card and crypto payments, the user completes the purchase out of band of Humun.js (through Stripe SDK, or on-chain crypto payments).
    - Once payment has been completed by supported payment method, `Humun.checkoutNow()` will be called by either the Stripe callback or crypto watcher. This will create a new order, which will also validate payment for transaction ID.
- Either watch the state with StateFx or access Humun.status.state for checkout-complete
- on checkout-complete, display thank you page

### Testing Payment Flow

In DEV environment, card client is initialized in test mode and can be tested using [supported test cards](https://stripe.com/docs/testing).

There is currently not a "test net" integration for crypto payments. To test crypto payment flow, test up to the point where you have presented the crypto pricing and addresses to the client, and verify that the `Humun.checkCryptoTx()` function is firing every `5 seconds` with the order request payload. As payment validation is done by the API, you will not be able to fully create a test order using crypto payment, you will need to manually trigger the [close-out functions](https://github.com/robertlestak/humun.js/blob/3aee37f9035d19c70f82b2755fc39759c5e51285/src/humun-v0.0.2.js#L790) in the JS console. We are investigating options for a testnet crypto integration in DEV env.