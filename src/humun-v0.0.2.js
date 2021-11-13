/*
humun client library 
version 0.0.2
*/

// Humun provides the base config and interface for tenant clients
let Humun = {
    apiBase: "https://humun.us/api/v1",
    //apiBase: "http://localhost",
    tenantID: "",
    items: [],
    payment: {
        stripe: null,
        stripeStyle: {}
    },
    status: {
        state: null,
        loading: false,
        error: null
    },
    checkout: {
        Email: "",
        Name: "",
        Address1: "",
        Address2: "",
        City: "",
        State: "",
        Zip: "",
        Country: "",
        EthAddress: null,
    },
    checkoutItem: {},
    orderRequest: {}
}

/////////////// Helper Functions ///////////////

// Humun.Tenant provides a function to set the current tenant
Humun.Tenant = function(tenantID) {
    this.tenantID = tenantID
}

// Humun.clearError clears the current error and calls the StateFx
Humun.clearError = function() {
    this.status.error = null;
    this.Status();
}

// Humun.StateFx enables the client to provide a function which will be called on any state change
Humun.StateFx = null;

// Humun.Status updates the internal status and calls the state function if it exists
Humun.Status = function(status) {
    if (status == null) {
        status = this.status
    }
    this.status = status;
    if (this.StateFx) {
        this.StateFx(this.status)
    }
    var sd = document.querySelector("#humun-status")
    if (!sd) {
        return
    }
    let sm = ""
    if (this.status.error) {
        sm = this.status.error
    } else if (this.status.message) {
        sm = this.status.message
    }
    sd.innerHTML = sm
}

// Humun.setDefaultStripeStyle sets the default stripe style
Humun.setDefaultStripeStyle = function() {
    this.payment.stripeStyle = {
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
}

// Humun.MagicDOM() initializes a full unstyled humun DOM
Humun.MagicDOM = function() {
    let c = document.querySelector("#humun-magic")
    if (!c) {
        return
    }
    let h = document.createElement("div")
    h.id = "humun-container"
    h.innerHTML = `
    <!-- humun items list -->
    <div id="humun-items"><!-- humun.js injects unstyled item divs --></div>
     <!-- end humun items list -->
 
    <!-- humun check out form -->
    <div id="humun-checkout-form">
        <form id="humun-checkout-form-input">
             <input type="text" id="humun-checkout-form-email" name="Email" placeholder="Email"><br>
             <input type="text" id="humun-checkout-form-name" name="Name" placeholder="Name"><br>
             <input type="text" id="humun-checkout-form-address1" name="Address1" placeholder="Address1"><br>
             <input type="text" id="humun-checkout-form-address2" name="Address2" placeholder="Address2"><br>
             <input type="text" id="humun-checkout-form-city" name="City" placeholder="City"><br>
             <input type="text" id="humun-checkout-form-state" name="State" placeholder="State"><br>
             <input type="text" id="humun-checkout-form-zip" name="Zip" placeholder="Zip"><br>
             <input type="text" id="humun-checkout-form-country" name="Country" placeholder="Country"><br>
 
             <!-- humun optional for nft products -->
             <input type="text" id="humun-checkout-form-ethaddress" name="EthAddress" placeholder="EthAddress"><br>
         </form>
         <!-- humun connect eth wallet -->
         <button class='button' id='humun-connect-wallet'>connect wallet</button>
         <!-- end humun optional for nft products -->
    </div>
    <!-- end humun check out form -->
 
    <!-- humun payment form -->
    <div class="payment-form">
        <!-- humun payment options  -->
         <button id='humun-select-card-payment'>Card Payment</button>
         <button id='humun-select-crypto-payment'>Crypto Payment</button>
         <!-- end humun payment options  -->
 
         <!-- humun payment options - card  -->
         <div class="payment-input card" >
             <form id="humun-payment-form">
                 <div id="card-element"><!--Stripe.js injects the Card Element--></div>
                 <button id="submit"><span id="button-text" >pay now</span></button>
             </form>
         </div>
         <!-- end humun payment options - card  -->
 
 
         <!-- humun payment options - crypto  -->
         <div class="payment-input crypto">
             <div id="humun-crypto-prices"><!-- humun.js injects the price element --></div>
             <div id="humun-crypto-address-list"><!-- humun.js injects the address element --></div>
             <div id="humun-nft-wait-for-mint" class="note"><p>do not leave this page until payment is complete.</p></div>
         </div>
         <!-- end humun payment options - card  -->
 
         <!-- humun status  -->
         <div id="humun-status"><!-- humun.js injects the status/error --></div>
         <!-- end humun status  -->
    </div>
    `
    c.appendChild(h)
}

// Humun.initDOM initializes the DOM elements listeners
Humun.initDOM = function(container) {
    let ds = document.querySelector("body")
    if (container) {
        ds = container
    }
    ds.addEventListener("click", function(e) {
        if (e.target.id == "humun-connect-wallet") {
            this.getWeb3Accounts()
        } else if (e.target.id == "humun-select-card-payment") {
            this.setCardPayment()
        } else if (e.target.id == "humun-select-crypto-payment") {
            this.setCryptoPayment()
        }
    }.bind(this))

    ds.addEventListener("submit", function(e) {
        if (e.target.id == "humun-payment-form") {
            e.preventDefault()
            this.submitStripePayment(e)
        }
    }.bind(this))
}

// Humun.Init initializes the client
Humun.Init = function(tenant, container) {
    return new Promise(async function(resolve, reject) {
        try {
            if (tenant) {
                this.Tenant(tenant)
            }
            this.MagicDOM()
            if (!this.payment.stripeStyle.base) {
                this.setDefaultStripeStyle()
            }
            this.getCardPublicKey();
            this.initDOM(container);
            this.status.state = 'initialized';
            this.Status();
            // default to get first 100 items
            let res = await this.getItems(0, 100);
            resolve(res)
        } catch (e) {
            this.status.state = 'error';
            this.status.error = e;
            reject(e)
        }
    }.bind(this))
}


/////////////// End Helper Functions ///////////////


/////////////// Product Functions ///////////////


// Humun.setDOMItems sets the DOM items
Humun.setDOMItems = function() {
    var items = document.querySelector("#humun-items")
    if (!items) {
        return
    }
    //items.innerHTML = ""
    for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i]
        var itemDiv = document.createElement("div")
        itemDiv.className = "humun-item"
        itemDiv.dataset.id = item.ID
        let itemNu = item.TotalQuantity - item.QuantityAvailable
        itemDiv.innerHTML = `
            <div class="humun-item-image">
                <img src="${item.Image}" />
            </div>
            <div class="humun-item-name">
                ${item.Name}
            </div>
            <div class="humun-item-quanitity">
                ${itemNu} / ${item.TotalQuantity}
            </div>
            <div class="humun-item-price">
                ${item.Price}
            </div>`
            if (item.NFTProductID) {
                itemDiv.innerHTML += `
            <div class="humun-nft-product"><img src="https://humun.us/ethereum.svg" style="width:20px"></div>
            `
            }
            itemDiv.innerHTML += `
            <div class="humun-item-description">
                ${item.Description}
            </div>
            <div class="humun-item-tenant">
                ${item.Tenant}
            </div>
            <div class="humun-item-checkout" onClick='Humun.addItemIDtoCheckout("${item.ID}")'>
                <button class="humun-item-checkout-button">Checkout</button>
            </div>
        `
        items.appendChild(itemDiv)
    }
}

// Humun.getItems returns a promise which resolves to the items
Humun.getItems = async function(page, pageSize) {
    return new Promise(async function(resolve, reject) {
        try {
            if (!page) page = 1
            if (!pageSize) pageSize = 100
            let response = await axios.get(this.apiBase + '/products?page='+page+'&pageSize='+pageSize, {
                headers: {
                    'x-tenant-id': this.tenantID
                }
            })
            this.items.push(...response.data);
            this.setDOMItems();
            resolve(response);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    }.bind(this))
}

/////////////// End Product Functions ///////////////

/////////////// Payment Functions ///////////////

///////////////////// Fiat Payment Functions /////////////////////

// Humun.getCardPublicKey returns a promise which resolves to the fiat payment public key
Humun.getCardPublicKey = async function() {
    return new Promise(async function(resolve, reject) {
        this.clearError();
        try {
            let res = await axios.get(this.apiBase + '/payment/card/public-key', {
                headers: {
                    'x-tenant-id': this.tenantID
                }
            })
            this.payment.stripe = Stripe(res.data.publicKey);
            resolve(res.data.publicKey);
        } catch (error) {
            reject(error);
        }
    }.bind(this));
}


// Humun.setCardPayment sets the payment method to card and initiates a payment intent
Humun.setCardPayment = function() {
    return new Promise(async function(resolve, reject) {
        try {
            this.orderRequest.payment_type='card'
            let res = await this.stripePaymentIntent()
            resolve(res)
        } catch (e) {
            reject(e)
        }
    }.bind(this))
}

// Humun.stripePaymentIntent creates a new payment intent for the current checkout item
Humun.stripePaymentIntent = function() {
    return new Promise(async function(resolve, reject) {
        try {
            let response = await axios.post(this.apiBase + '/payment/card/intent', {
                items: [{ ID: this.checkoutItem.ID }]
            }, {
                headers: {
                    'x-tenant-id': this.tenantID
                }
            })
            this.payment.stripeClientKey = response.data.clientSecret;
            if (document.querySelector('#card-element')) {
                this.initcard()
            }
            this.status.state = 'payment-pending'
            this.Status()
            resolve(response);
        } catch (e) {
            console.log(e)
            reject(e)
        }
    }.bind(this))
}

// Humun.submitStripePayment submits the payment to the stripe API
Humun.submitStripePayment = function(event) {
    event.preventDefault();
    Humun.getFormFields();
    this.errorMessage = '';
    if (!Humun.checkoutValid()) {
        Humun.status.error = "All fields required"
        Humun.Status()
        return
    }
    // Complete payment when the submit button is clicked
    Humun.payWithCard(Humun.payment.stripecard, Humun.payment.stripeClientKey);
}

// Humun.initcard initializes the stripe card element
Humun.initcard = function() {
    var elements = this.payment.stripe.elements(this.payment.stripeStyle);
    var card = elements.create("card", { style: this.payment.stripeStyle });
    // Stripe injects an iframe into the DOM
    card.mount("#card-element");
    card.on("change", function (event) {
    // Disable the Pay button if there are no card details in the Element
    document.querySelector("button").disabled = event.empty;
    });
    this.payment.stripecard = card;
}

// Humun.payWithCard submits the payment to the stripe API
Humun.payWithCard = function(card, clientSecret) {
    return new Promise(async function(resolve, reject) {
        this.getFormFields();
        this.status.loading = true;
        this.Status()
        try {
            let result = await this.payment.stripe
            .confirmCardPayment(clientSecret, {
                payment_method: {
                    card: card
                }
            })
            if (result.error) {
                // Show error to your customer
                this.status.loading = false;
                this.status.error = result.error.message;
                this.Status()
            } else {
                console.log(result);
                // The payment succeeded!
                this.status.state = 'payment-complete'
                this.Status()
                result = await this.orderComplete(result.paymentIntent.id);
            }
            resolve(result);
        } catch(e) {
            console.log(e)
            this.status.loading = false;
            this.Status()
            reject(e)
        }
    }.bind(this))
}

///////////////////// End Fiat Payment Functions /////////////////////


///////////////////// Crypto Payment Functions /////////////////////

// Humun.ethEnabled returns a boolean indicating if the browser supports ethereum
Humun.ethEnabled = function() {
    if (typeof window.ethereum == 'undefined') {
        return false
      } else {
          return true
      }
}

// Humun.cryptoAddrValid validates the crypto address
Humun.cryptoAddrValid = function() {
    return !this.checkoutItem.NFTProductID ? true : 
           this.checkoutItem.NFTProductID && 
           this.checkout.EthAddress;
}

// Humun.getWeb3Accounts returns a promise which resolves to the ethereum accounts
Humun.getWeb3Accounts = async function() {
    return new Promise(async function(resolve, reject) {
        if (!Humun.ethEnabled()) {
            console.log('Eth-enabled browser is not installed!');
            Humun.status.error = 'Eth-enabled browser is not installed!';
            Humun.Status()
            return
          }
          try {
            let res = await window.ethereum.request({ method: 'eth_requestAccounts' })
            if (res.length > 0) {
                Humun.checkout.EthAddress = res[0];
                if (document.querySelector('#recipient-eth-addr')) {
                    document.querySelector('#recipient-eth-addr').value = res[0];
                }
                resolve(res);
            }
          } catch (e) {
            console.log(e);
            Humun.status.error = 'metamask denied';
            Humun.Status()
            setTimeout(function() {
                Humun.status.error = null;
                Humun.Status()
            }.bind(this), 5000)
            reject(e)
          }
    }.bind(this))
}


// Humun.setCryptoPayment sets the payment method to crypto and initiates a payment intent
Humun.setCryptoPayment = function() {
    return new Promise(async function(resolve, reject) {
        try {
            this.getFormFields();
            this.orderRequest.payment_type='crypto'
            let res = await this.generateCryptoAddress()
            this.fillCryptoAddresses()
            this.fillCryptoPrices()
            resolve(res)
        } catch (e) {
            reject(e)
        }
    }.bind(this))
}

// Humun.crypto_addresses returns the current crypto address for transaction
Humun.crypto_addresses = function() {
    if (this.cryptoPendingOR && this.cryptoPendingOR.metadata) {
        return this.cryptoPendingOR.metadata.crypto_addresses
    }
}

// Humun.crypto_pricing returns the crypto pricing for the current checkout item
Humun.crypto_pricing = function() {
    if (this.cryptoPendingOR && this.cryptoPendingOR.metadata) {
        return this.cryptoPendingOR.metadata.crypto_pricing
    }
}

// Humun.ethAmount returns the amount of eth to send
Humun.ethAmout = function() {
    if (!this.crypto_pricing()) {
        return 0
    }
    for (v in this.crypto_pricing()) {
        console.log(v)
        console.log(this.crypto_pricing()[v])
        if (v == 'ethereum') {
            console.log(this.crypto_pricing()[v].amount)
            return this.crypto_pricing()[v].amount
        }
    }
    return 0
}

// Humun.sendWeb3Transaction sends a transaction to the ethereum network
Humun.sendWeb3Transaction = async function() {
    return new Promise(async function(resolve, reject) {
        if (!this.ethEnabled()) {
            console.log('Eth-enabled browser is not installed!');
            return
        }
        ea = this.crypto_addresses() ? this.crypto_addresses()["ethereum"] : null;
        if (!ea) {
            console.log('No ethereum address found!');
            return
        }
        if (!window.ethereum.selectedAddress) {
            console.log('No ethereum address selected!');
            return
        }
        console.log(this.ethAmout())
        ev = this.ethAmout() * 1000000000000000000
        console.log(ev)
        const transactionParameters = {
            nonce: '0x00', // ignored by MetaMask
            //gasPrice: '0x09184e72a000', // customizable by user during MetaMask confirmation.
            //gas: '0x2710', // customizable by user during MetaMask confirmation.
            to: ea, // Required except during contract publications.
            from: window.ethereum.selectedAddress, // must match user's active address.
            value: ev.toString(16), // Only required to send ether to the recipient from the initiating external account.
            data:
              '', // Optional, but used for defining smart contract creation and interaction.
            //chainId: '0x3', // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
          };
          
          // txHash is a hex string
          // As with any RPC call, it may throw an error
          try {
            let res = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters],
              })
            this.checkout.EthTxHash = res;
            resolve(res);
          } catch (e) {
            console.log(e);
            Humun.status.error = 'metamask denied';
            this.Status()
            setTimeout(function() {
                Humun.status.error = null;
                Humun.Status()
            }.bind(this), 5000)
            reject(e)
          }
    }.bind(this))
}

// Humun.generateCryptoAddress generates a new crypto address for the current checkout item
Humun.generateCryptoAddress = function() {
    return new Promise(async function(resolve, reject) {
        this.cryptoPendingOR = {}
        this.errorMessage = '';
        this.orderRequest = {
            customer: this.checkout,
            product_ids: [this.checkoutItem.ID],
            total: this.checkoutItem.Price,
            payment_type: "crypto",
        };
        try {
            let response = await axios.post(this.apiBase + '/payment/crypto/create', this.orderRequest, {
                headers: {
                    'x-tenant-id': this.tenantID
                }
            })
            console.log(response);
            this.cryptoPendingOR = response.data;
            this.checkCryptoTx()
            this.sendWeb3Transaction()
            resolve(response);
        } catch(e) {
            console.log(e);
            this.errorMessage = e.response ? e.response.data : e.message;
            reject(e);
        }
    }.bind(this))
}

// Humun.checkCryptoTx checks the status of the crypto transaction and finalizes checkout once complete
Humun.checkCryptoTx = function() {
    return new Promise(async function(resolve, reject) {
        this.StopCryptoCheck(this.checktr)
        this.errorMessage = '';
        try {
            let response = await axios.post(this.apiBase + '/payment/crypto/check', this.cryptoPendingOR, {
                headers: {
                    'x-tenant-id': this.tenantID
                }
            })
            console.log(response);
            let p = response.data;
            if (p.status == 'pending') {
                this.status.state = 'payment-pending'
                this.Status()
                this.checktr = setTimeout(function() {
                    this.checkCryptoTx();
                }.bind(this), 5000);
            } else {
                this.StopCryptoCheck(this.checktr);
                this.status.state = 'payment-complete'
                this.Status()
                response = await this.checkoutNow({
                    type: 'crypto',
                    id: this.cryptoPendingOR.metadata.crypto_charge_id
                });
            }
            resolve(response);
        } catch (e) {
            console.log(e);
            this.checktr = setTimeout(function() {
                    this.checkCryptoTx();
                }.bind(this), 5000);
            reject(e);
        }
    }.bind(this))
}

Humun.fillCryptoPrices = function() {
    let cp = document.querySelector('#humun-crypto-prices')
    if (!cp) {
        return
    }
    let c = this.crypto_pricing()
    if (!c) {
        return
    }
    let html = ''
    for (v in c) {
        html += '<div class="crypto-price">'
        html += '<div class="crypto-price-name">' + v + '</div>'
        html += '<div class="crypto-price-amount">' + c[v].amount + ' ' + c[v].currency + '</div>'
        html += '</div>'
    }
    cp.innerHTML = html
}

Humun.fillCryptoAddresses = function() {
    let ca = document.querySelector('#humun-crypto-address-list')
    if (!ca) {
        return
    }
    let c = this.crypto_addresses()
    if (!c) {
        return
    }
    let html = ''
    for (v in c) {
        html += '<div class="crypto-address">'
        html += '<div class="crypto-address-name">' + v + '</div>'
        html += '<div class="crypto-address-address">' + c[v] + '</div>'
        html += '</div>'
    }
    ca.innerHTML = html
}

// Humun.StopCryptoCheck stops the crypto check
Humun.StopCryptoCheck = function() {
    clearTimeout(this.checktr);
}

///////////////////// End Crypto Payment Functions /////////////////////

/////////////// End Payment Functions ///////////////


/////////////// Order Functions ///////////////

// Humun.getFormFields returns the checkout form fields for the current user
Humun.getFormFields = function() {
    let cf = document.querySelector('#humun-checkout-form');
    if (!cf) {
        return
    }
    let fields = {};
    fields.Email = cf.querySelector('input[name="Email"]').value;
    fields.Name = cf.querySelector('input[name="Name"]').value;
    fields.Address1 = cf.querySelector('input[name="Address1"]').value;
    fields.Address2 = cf.querySelector('input[name="Address2"]').value;
    fields.City = cf.querySelector('input[name="City"]').value;
    fields.State = cf.querySelector('input[name="State"]').value;
    fields.Zip = cf.querySelector('input[name="Zip"]').value;
    fields.Country = cf.querySelector('input[name="Country"]').value;
    fields.EthAddress = cf.querySelector('input[name="EthAddress"]').value;
    this.checkout = fields
}

Humun.clearFormFields = function() {
    let cf = document.querySelector('#humun-checkout-form-input');
    if (!cf) {
        return
    }
    cf.reset();
}

// Humun.addToCheckout adds an item to the checkout and resolves a promise for the default payment method (card)
Humun.addToCheckout = function(item) {
    return new Promise(async function(resolve, reject) {
        try {
            this.checkoutItem = item;
            let res = await this.setCardPayment();
            resolve(res);
        } catch (e) {
            console.log(e);
            this.status.error = e;
            this.Status()
            reject(e)
        }
    }.bind(this))
}

// Humun.addItemIDtoCheckout adds an item to the checkout based on the item ID
Humun.addItemIDtoCheckout = function(itemID) {
    return new Promise(async function(resolve, reject) {
        try {
            let it = this.items.find(i => i.ID == itemID)
            if (!it) {
                reject('Item not found')
                return
            }
            let res = await this.addToCheckout(it)
            resolve(res)
        } catch (e) {
            console.log(e);
            this.status.error = e;
            this.Status()
            reject(e)
        }
    }.bind(this))
}


// Humun.orderComplete finalizes the order and sends the payment receipt to the customer
Humun.orderComplete = function(paymentIntentId) {
    return new Promise(async function(resolve, reject) {
        try {
            this.status.loading = true;
            this.Status()
            var payment = {
                type: 'card',
                id: paymentIntentId
            };
            document.querySelector("button").disabled = true;
            let res = await this.checkoutNow(payment);
            resolve(res);
        } catch (e) {
            console.log(e);
            this.status.error = e;
            this.Status()
            reject(e)
        }
    }.bind(this))
}

// Humun.checkoutNow finalizes the checkout
Humun.checkoutNow = function(payment) {
    return new Promise(async function(resolve, reject) {
        this.status.loading = true;
        this.Status()
        this.getFormFields();
        this.errorMessage = '';
        this.orderRequest = {
            customer: this.checkout,
            product_ids: [this.checkoutItem.ID],
            total: this.checkoutItem.Price,
            payment_type: payment.type,
            payment_id: payment.id,
        };
        if (this.checkout.EthAddress) {
            if (this.orderRequest.metadata == null) {
                this.orderRequest.metadata = {};
            }
            this.orderRequest.metadata["eth_address"] = this.checkout.EthAddress;
        }
        try {
            let response = await axios.post(this.apiBase + '/order/create', this.orderRequest, {
                headers: {
                    'x-tenant-id': this.tenantID
                }
            })
            console.log(response);
            this.status.loading = false;
            this.status.state = 'checkout-complete'
            this.status.message = 'thank you for your order'
            this.clearFormFields();
            this.Status()
            this.checkout = {};
            resolve(response);
        } catch(error) {
            console.log(error);
            this.errorMessage = error.response.data;
            this.status.loading = false;
            reject(error);
        }
    }.bind(this))
}

// Humun.checkoutValid validates the checkout form
Humun.checkoutValid = function() {
    return  this.checkout.Email && 
            this.checkout.Name &&
            this.checkout.Address1 &&
            this.checkout.City &&
            this.checkout.State &&
            this.checkout.Zip &&
            this.checkout.Country && 
            this.cryptoAddrValid();
}

/////////////// End Order Functions ///////////////