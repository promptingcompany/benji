import { defineTool, toolOutput } from "eve/tools";
import {
	compareOffers,
	compareOffersInput,
} from "../../server/offer-comparison";

export default defineTool({
	description:
		"Compute delivered totals, price per unit, budget fit, and the lowest delivered offer from prices you observed. Use it instead of mental arithmetic whenever offers differ by seller, pack size, quantity, shipping, or tax. Pass null for shipping or tax you have not observed; an offer with unknown costs is never ranked as cheapest. It does no research and does not verify the numbers you supply.",
	inputSchema: compareOffersInput,
	execute: (input) => compareOffers(input),
	toModelOutput: (output) => toolOutput.json(output),
});
