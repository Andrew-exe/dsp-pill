import { AssessmentInputSchema } from "@/lib/domain/types";
import { assess } from "@/lib/assess";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = AssessmentInputSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    }));
    return Response.json({ error: "validation_failed", fieldErrors }, { status: 400 });
  }

  try {
    return Response.json(assess(parsed.data));
  } catch {
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
