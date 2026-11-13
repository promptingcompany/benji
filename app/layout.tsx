import type { ReactNode } from "react";
import "./style.css";

export const metadata = {
	title: "Benji",
	icons: { icon: "/brand/app-icon.svg" },
	description:
		"Meet Benji, The Prompting Company's personal shopping agent. Research products, compare offers, and find the right fit.",
};
export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
