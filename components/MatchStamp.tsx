export default function MatchStamp({ percent }: { percent: number }) {
  const display = Math.round(percent * 100);
  return (
    <span
      className="match-stamp"
      style={{ width: 56, height: 56, fontSize: 14 }}
      title="Match score"
    >
      {display}%
    </span>
  );
}
