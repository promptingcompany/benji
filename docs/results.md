# Results

Every run below is one fresh conversation per prompt, on November 11, 2026. The full
prompts, answers and tool calls are in the run export linked from the write-up.

## The study's store tests

The exact prompts from three of the study's store tests, word for word, 8 runs each, on the
hosted browser. The other agents' numbers are from the published study.

| Test | Other agents | dealfinder |
| --- | --- | --- |
| Unit price: lip balm, $28 single or $50 duo, budget $60 | Duo: Grok Bot 15/15, Muse 15/15, Instinct 15/15, Dots 11/15 | Duo 8/8, each with $25 a tube and the $6 saving |
| Shipping: lotion $52 + $8 on the brand site, free at retailers | Free-shipping retailer: Muse 12/14, Dots 12/15, Grok Bot 3/14, Instinct 0/15 | Free-shipping store 8/8, $52 delivered |
| "Only 3 left" on one of two identical $34 bottles | "In stock": Grok Bot 8/8, Muse 8/8 | "In stock" 8/8, stock named as the tie-break |

## Five shopping tasks on live stores

| Task | Prompt in short |
| --- | --- |
| Lotion | Nécessaire body lotion, cheapest delivered across the brand site, Sephora and Nordstrom, to the payment page |
| Skillet | Lodge 10.25" skillet, check at least 3 stores, lowest delivered total, to the payment page as a guest |
| Socks | Nike Everyday Cushioned crew socks, white, size L, ask before switching, to the payment page |
| Cable | 2 m USB-C cable from bestbuy.com under $25, guest checkout to the payment page |
| Lip balm | $55 budget, single at $28 or two-pack at $50, best value per tube, to the payment page |

Each prompt ends with made-up guest details: Test Shopper, shopper@example.com, 1455 Market
St, San Francisco, CA 94103.

Run on the hosted Browserbase browser, free plan.

| Task | Furthest step | Delivered total | What decided it |
| --- | --- | --- | --- |
| Skillet | Payment page | $36.03 at Lodge | Target ($33.14) and Walmart required an account, so Lodge was the cheapest guest checkout. |
| Cable | Payment page | $13.57 | Cheapest exact 2 m cable on Best Buy, free shipping. |
| Socks | Payment page | $30.72 | The exact style, size L, at a smaller retailer. Walmart's listing was sold out. |
| Lip balm | Payment page | $39.48 | The two-pack is cheaper per tube, but $63.38 delivered is over the $55 budget, so it bought the single. |
| Lotion | Asked first | | Asked for size and scent before comparing stores. |

## What these numbers do not show

- One run per task. These are single results, not rates.
- The five shopping tasks were not run on other agents with the same wording.
- dealfinder ran the store tests a week after the study's agents.
- The hosted runs used the free Browserbase plan: no managed proxies and no Verified
  Browsers.
