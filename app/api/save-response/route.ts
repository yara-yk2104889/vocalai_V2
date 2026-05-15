import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.participantId) {
      return Response.json({ ok: false, error: "No participantId" }, { status: 400 });
    }

    // Build the row with only the fields that were sent in this request
    const row: Record<string, unknown> = { participant_id: body.participantId };

    if (body.profile !== undefined) row.profile = body.profile;
    if (body.location !== undefined) row.location = body.location;
    if (body.scenario !== undefined) row.scenario = body.scenario;
    if (body.keywords !== undefined) row.keywords = body.keywords;
    if (body.selectedSentence !== undefined) row.selected_sentence = body.selectedSentence;
    if (body.sentenceMatch !== undefined) row.sentence_match = body.sentenceMatch;
    if (body.evaluationA !== undefined) row.evaluation_a = body.evaluationA;
    if (body.commentsA !== undefined) row.comments_a = body.commentsA;
    if (body.imageStyle !== undefined) row.image_style = body.imageStyle;
    if (body.aacSelection !== undefined) row.aac_selection = body.aacSelection;
    if (body.verifyDecision !== undefined) row.image_verify_decision = body.verifyDecision;
    if (body.verifyImageUrl !== undefined) row.image_url = body.verifyImageUrl;
    if (body.imageUrls !== undefined) row.image_urls = body.imageUrls;
    if (body.evaluationB !== undefined) row.evaluation_b = body.evaluationB;
    if (body.additionalComments !== undefined) row.additional_comments = body.additionalComments;
    if (body.submittedAt !== undefined) row.submitted_at = body.submittedAt;

    const { error } = await supabase
      .from("responses")
      .upsert(row, { onConflict: "participant_id" });

    if (error) {
      console.error("Supabase upsert error:", error);
      return Response.json({ ok: false, error: `${error.message} (code: ${error.code})` }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("save-response error:", msg);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
