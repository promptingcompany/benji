"use client";

import {
	type ComponentProps,
	createContext,
	type HTMLAttributes,
	type RefObject,
	useContext,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PromptInputContextType = {
	value: string;
	setValue: (value: string) => void;
	maxHeight: number;
	onSubmit?: () => void;
	disabled: boolean;
	isLoading: boolean;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
};

const PromptInputContext = createContext<PromptInputContextType | null>(null);

type PromptInputProps = Omit<HTMLAttributes<HTMLDivElement>, "onSubmit"> & {
	value?: string;
	onValueChange?: (value: string) => void;
	maxHeight?: number;
	onSubmit?: () => void;
	disabled?: boolean;
	isLoading?: boolean;
};

function PromptInput({
	value,
	onValueChange,
	maxHeight = 200,
	onSubmit,
	disabled = false,
	isLoading = false,
	className,
	...props
}: PromptInputProps) {
	const [internalValue, setInternalValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	return (
		<PromptInputContext.Provider
			value={{
				value: value ?? internalValue,
				setValue: onValueChange ?? setInternalValue,
				maxHeight,
				onSubmit,
				disabled,
				isLoading,
				textareaRef,
			}}
		>
			<div
				className={cn(
					"rounded-3xl border border-input bg-background p-2 shadow-xs focus-within:border-ring",
					disabled && "opacity-60",
					className,
				)}
				{...props}
			/>
		</PromptInputContext.Provider>
	);
}

function PromptInputTextarea({
	className,
	onKeyDown,
	...props
}: Omit<ComponentProps<typeof Textarea>, "value" | "onChange" | "ref">) {
	const context = useContext(PromptInputContext);
	if (!context) throw new Error("PromptInputTextarea requires PromptInput");
	const {
		value,
		setValue,
		maxHeight,
		onSubmit,
		disabled,
		isLoading,
		textareaRef,
	} = context;
	useLayoutEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = "auto";
		if (value)
			textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
	}, [value, maxHeight, textareaRef]);
	return (
		<Textarea
			{...props}
			ref={textareaRef}
			value={value}
			onChange={(event) => setValue(event.target.value)}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (
					!event.defaultPrevented &&
					event.key === "Enter" &&
					!event.shiftKey &&
					!event.nativeEvent.isComposing &&
					event.keyCode !== 229
				) {
					event.preventDefault();
					if (!disabled && !isLoading) onSubmit?.();
				}
			}}
			rows={1}
			disabled={disabled || props.disabled}
			className={cn(
				"min-h-12 w-full resize-none field-sizing-fixed border-none bg-transparent px-3 py-3 shadow-none focus-visible:ring-0",
				className,
			)}
		/>
	);
}

function PromptInputActions({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={cn("flex items-center gap-2", className)} {...props} />
	);
}

export { PromptInput, PromptInputActions, PromptInputTextarea };
