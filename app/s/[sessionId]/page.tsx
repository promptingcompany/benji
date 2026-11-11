import { shoppingConfiguration } from "../../../server/shopping-configuration";
import Chat from "../../chat";
export default async function Page({
	params,
}: {
	params: Promise<{ sessionId: string }>;
}) {
	const { sessionId } = await params;
	return (
		<Chat
			key={sessionId}
			sessionId={sessionId}
			configuration={shoppingConfiguration()}
		/>
	);
}
