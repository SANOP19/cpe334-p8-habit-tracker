// Shows a message from the server (or a generic one) so the user knows what to fix.
export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="alert alert-danger my-3">
      {message}
    </div>
  );
}
