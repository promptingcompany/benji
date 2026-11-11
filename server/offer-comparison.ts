import { z } from "zod";

const amount = z.number().finite().nonnegative().max(1_000_000);

const offerInput = z.object({
	label: z.string().min(1).max(200),
	seller: z.string().min(1).max(120),
	currency: z.string().regex(/^[A-Za-z]{3}$/),
	packPrice: amount.describe("Listed price of one pack or listing."),
	unitsPerPack: z.number().int().min(1).max(10_000).default(1),
	packs: z.number().int().min(1).max(1_000).default(1),
	shipping: amount
		.nullable()
		.describe("Observed shipping charge. null when not yet known, never 0."),
	freeShippingOver: amount
		.optional()
		.describe("Merchandise subtotal at which the seller ships free."),
	tax: amount
		.nullable()
		.describe("Observed or sourced tax. null when not yet known, never 0."),
	fees: amount.default(0),
	discount: amount.default(0).describe("Verified discount already applied."),
});

export const compareOffersInput = z.object({
	offers: z.array(offerInput).min(1).max(12),
	budget: amount.optional(),
	unitsNeeded: z.number().int().min(1).max(10_000).optional(),
});

type OfferInput = z.infer<typeof offerInput>;

const cents = (value: number) => Math.round(value * 100);
const money = (value: number) => value / 100;

function shippingCents(offer: OfferInput, shipsFree: boolean) {
	if (shipsFree) return 0;
	return offer.shipping === null ? null : cents(offer.shipping);
}

function priceOffer(offer: OfferInput) {
	const merchandise = Math.max(
		0,
		cents(offer.packPrice) * offer.packs - cents(offer.discount),
	);
	const shipsFree =
		offer.freeShippingOver !== undefined &&
		merchandise >= cents(offer.freeShippingOver);
	const shipping = shippingCents(offer, shipsFree);
	const tax = offer.tax === null ? null : cents(offer.tax);
	const unknownCosts: string[] = [];
	if (shipping === null) unknownCosts.push("shipping");
	if (tax === null) unknownCosts.push("tax");
	return {
		offer,
		merchandise,
		shipsFree,
		unknownCosts,
		knownSubtotal:
			merchandise + (shipping ?? 0) + (tax ?? 0) + cents(offer.fees),
		units: offer.unitsPerPack * offer.packs,
	};
}

type PricedOffer = ReturnType<typeof priceOffer>;

function budgetFit(entry: PricedOffer, budgetCents: number | undefined) {
	if (budgetCents === undefined) return undefined;
	if (entry.knownSubtotal > budgetCents) return false;
	return entry.unknownCosts.length === 0 ? true : null;
}

export function compareOffers(input: z.input<typeof compareOffersInput>) {
	const { offers, budget, unitsNeeded } = compareOffersInput.parse(input);
	const currencies = [
		...new Set(offers.map((offer) => offer.currency.toUpperCase())),
	];
	if (currencies.length > 1)
		return {
			comparable: false as const,
			reason: `Offers use different currencies (${currencies.join(", ")}). Compare within one currency or state the conversion source.`,
		};

	const priced = offers.map(priceOffer);
	const complete = priced
		.filter((entry) => entry.unknownCosts.length === 0)
		.sort((a, b) => a.knownSubtotal - b.knownSubtotal);
	const lowest = complete.at(0);
	const budgetCents = budget === undefined ? undefined : cents(budget);

	const results = priced.map((entry) => {
		const isComplete = entry.unknownCosts.length === 0;
		const threshold = entry.offer.freeShippingOver;
		return {
			label: entry.offer.label,
			seller: entry.offer.seller,
			units: entry.units,
			merchandise: money(entry.merchandise),
			deliveredTotal: isComplete ? money(entry.knownSubtotal) : null,
			knownSubtotal: money(entry.knownSubtotal),
			unknownCosts: entry.unknownCosts,
			listPricePerUnit: money(Math.round(entry.merchandise / entry.units)),
			deliveredPricePerUnit: isComplete
				? money(Math.round(entry.knownSubtotal / entry.units))
				: null,
			deliveredRank: isComplete ? complete.indexOf(entry) + 1 : null,
			cannotBeLowest:
				!isComplete &&
				lowest !== undefined &&
				entry.knownSubtotal > lowest.knownSubtotal,
			withinBudget: budgetFit(entry, budgetCents),
			unitsBeyondNeed:
				unitsNeeded === undefined
					? undefined
					: Math.max(0, entry.units - unitsNeeded),
			coversNeed:
				unitsNeeded === undefined ? undefined : entry.units >= unitsNeeded,
			amountToFreeShipping:
				threshold !== undefined && !entry.shipsFree
					? money(cents(threshold) - entry.merchandise)
					: undefined,
		};
	});

	return {
		comparable: true as const,
		currency: currencies[0],
		lowestDelivered: lowest
			? { label: lowest.offer.label, seller: lowest.offer.seller }
			: null,
		undecided: results
			.filter(
				(result) => result.deliveredTotal === null && !result.cannotBeLowest,
			)
			.map(({ label, seller, unknownCosts }) => ({
				label,
				seller,
				unknownCosts,
			})),
		offers: results,
	};
}
