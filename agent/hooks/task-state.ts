import { defineHook, type HookContext, type HookEvent } from "eve/hooks";

import {
	closeBrowserRuntime,
	resumeBrowserAfterHumanInput,
} from "../lib/browser-runtime";
import { applyTaskEvent, type TaskEvent, taskState } from "../lib/task-state";

const withMeta = (event: HookEvent, ctx: HookContext): TaskEvent => ({
	...event,
	meta: {
		id: `${ctx.position.line}:${ctx.position.index}`,
		at: ctx.now.toISOString(),
	},
});

const update = (event: HookEvent, ctx: HookContext) =>
	taskState.update((current) =>
		applyTaskEvent(current, withMeta(event, ctx), ctx.session.id),
	);

export default defineHook({
	events: {
		"session.started": update,
		"turn.started": update,
		"delivery.consumed": (event, ctx) => {
			taskState.update((current) => {
				const next = applyTaskEvent(
					current,
					withMeta(event, ctx),
					ctx.session.id,
				);
				if (next !== current && current.status === "waiting_for_user")
					resumeBrowserAfterHumanInput(ctx.session.id);
				return next;
			});
		},
		"model.started": update,
		"interaction.opened": update,
		"interaction.settled": update,
		async "turn.settled"(event, ctx) {
			if (event.data.outcome === "cancelled")
				await closeBrowserRuntime(ctx.session.id);
			update(event, ctx);
		},
		"session.ended": update,
	},
});
