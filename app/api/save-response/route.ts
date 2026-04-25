import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { error } = await supabase.from("responses").insert({
      participant_id: body.participantId,
      profile: body.profile,
      scenario: body.scenario,
      keywords: body.keywords,
      selected_sentence: body.selectedSentence,
      verify_decision: body.verifyDecision,
      verify_image_url: body.verifyImageUrl,
      evaluation_a: body.evaluationA,
      comments_a: body.commentsA,
      evaluation_b: body.evaluationB,
      additional_comments: body.additionalComments,
      submitted_at: body.submittedAt,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return Response.json({ ok: false }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("save-response error:", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
