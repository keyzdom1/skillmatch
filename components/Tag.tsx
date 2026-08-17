type TagTone = "neutral" | "urgent" | "success" | "info";

const TONES: Record<TagTone, string> = {
  neutral: "bg-[#EEF0E9] text-ink",
  urgent: "bg-[#FFE9E3] text-[#A83C26]",
  success: "bg-[#E1F2EC] text-teal",
  info: "bg-[#E7EBF4] text-ink/80",
};

export default function Tag({
  tone = "neutral",
  children,
}: {
  tone?: TagTone;
  children: React.ReactNode;
}) {
  return <span className={`tag ${TONES[tone]}`}>{children}</span>;
}
