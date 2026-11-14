export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="d-flex align-items-center gap-2 text-secondary my-3">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
