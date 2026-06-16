type DesktopOnlyProps = {
  children: React.ReactNode;
};

export default function DesktopOnly({ children }: DesktopOnlyProps) {
  return (
    <div className="desktop-only-shell">
      <div className="desktop-only-content">{children}</div>
      <div className="desktop-only-message" role="status">
        <p>Sorry, BloomPal currently supports desktop web only.</p>
      </div>
    </div>
  );
}
