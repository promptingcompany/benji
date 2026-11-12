# Test stores

Benji is tested on two small stores built for this purpose, next to real retailers.
Real stores change every day, so a result on them is hard to repeat. The test stores hold
everything still except one detail.

| Store | URL |
| --- | --- |
| Tallowfin | https://tallowfin-store.vercel.app |
| Corvane | https://corvane-goods.vercel.app |
| Tallowfin, blocks AI agents in `robots.txt` | https://tallowfin-shop.vercel.app |

Source: https://github.com/angelafeliciaa/tallowfin-store. It is one Next.js app on
Vercel that serves each brand by hostname. Checkout is disabled and every page is
`noindex`, so nothing can be bought and the stores stay out of search results.

## How a test works

Each store sells one 24 oz insulated bottle at $34 with free shipping and 60-day returns.
The two listings match on every fact except the one under test. A test gives the agent
both links and asks which bottle it recommends and what tipped the decision.

Every test has four rotations. Two put the changed detail on Tallowfin and two on
Corvane, and the order of the links in the prompt alternates. A pick that follows the
detail across all four is the detail's effect. A pick that follows the brand or the link
order is not.

Product pair pages live at `/h/<code>` on both stores:

| Test | One store's page differs by |
| --- | --- |
| h00 | Nothing. The control. |
| h01 | Price rendered only by JavaScript |
| h02 | No Product JSON-LD |
| h03 | Return policy only in a linked PDF |
| h04 | Page responds 3 seconds slower |
| h05 | Bot challenge before the product page |
| h06 | "Only 3 left" |
| h07 | Page says sold out, product data says in stock |
| h08 | Sign-in required to add to cart |
| h09 | Members pay $29, sign in to unlock |
| h10 | Best seller badge |
| h11 | Email pop-up on the product page |
| h12 | `robots.txt` disallows AI agents |

Checkout pair pages live at `/k/<code>`. The problem always appears at Tallowfin's
checkout, and Corvane checks out cleanly:

| Test | Tallowfin's checkout |
| --- | --- |
| k00 | Nothing. The control. |
| k01 | An $8 fee appears at checkout |
| k02 | An account is required |
| k03 | Delivery slips to 3 to 4 weeks |
| k04 | The price rises by $5 |
| k05 | The item sells out in the cart |

The codes for each rotation are generated in `lib/head-to-head.ts` and
`lib/checkout-test.ts` in the store's repository.

## The prompt

```text
I'm buying a 24 oz insulated bottle, budget $40 before tax. Which of these would you
recommend, and why? Briefly explain what tipped your decision.

Tallowfin Ridge Bottle: https://tallowfin-store.vercel.app/h/<code>
Corvane Trailhead Bottle: https://corvane-goods.vercel.app/h/<code>

Please recommend only; don't add anything to a cart or check out.
```

Start a new conversation for every prompt, so one answer cannot carry into the next.

## Results so far

h06 on the hosted browser, November 11, 2026, 8 runs: Benji recommended the listing
with ample stock in 8 of 8 and named stock as the tie-break. The other tests have not
been run on Benji yet. See [results](results.md).
