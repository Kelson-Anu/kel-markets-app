import { createStart, createCsrfMiddleware } from "@tanstack/react-start";

// Project-specific bearer attacher (resilient version of the generated one).
import { attachSupabaseAuth } from "@/lib/auth-attacher";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [csrfMiddleware],
}));
