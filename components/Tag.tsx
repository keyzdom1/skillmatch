type TagTone = "neutral" | "urgent" | "success" | "info";

const TONES: Record<TagTone, string> = {
  neutral: "bg-slate/15 text-ink",
  urgent: "bg-coral/15 text-coral",
  success: "bg-teal/15 text-teal",
  info: "bg-slate/15 text-ink/80",
};

export default function Tag({
  tone = "neutral",
  children,
}: {
  tone?: TagTone;
  children: React.ReactNode;
}) {
  return (
    <span className={`tag max-w-full break-words ${TONES[tone]}`}>{children}</span>
  );
}
