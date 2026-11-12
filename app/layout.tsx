import type { ReactNode } from "react";
import "./style.css";

export const metadata = {
	title: "Rick",
	icons: { icon: "/rick.svg" },
	description:
		"Meet Rick, The Prompting Company's personal shopping agent. Research products, compare offers, and find the right fit.",
};
export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
