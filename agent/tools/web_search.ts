import { webSearch } from "eve/tools/web_search";

// AI Gateway runs the search with the same credentials as the model, so
// public web research needs no key of its own.
export default webSearch({ provider: "parallel" });
