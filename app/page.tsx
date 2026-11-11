import { shoppingConfiguration } from "../server/shopping-configuration";
import Chat from "./chat";

export const dynamic = "force-dynamic";

export default function Page() {
	return <Chat configuration={shoppingConfiguration()} />;
}
