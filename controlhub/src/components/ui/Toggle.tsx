/** Brand switch toggle (sky-blue when on), matching the reference design. */
export function Toggle({
  checked,
  onChange,
  onClick,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <label className="tgl" onClick={onClick}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="tgl-track" />
    </label>
  );
}
