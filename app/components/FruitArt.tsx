export type FruitArtKind = "apple" | "cherry" | "lemon" | "pear" | "strawberry";

export function FruitArt({ kind, className = "", label }: { kind: FruitArtKind; className?: string; label?: string }) {
  return (
    <span className={`fruit-art fruit-art-${kind} ${className}`.trim()} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <span className="fruit-art-body" />
      {kind === "cherry" ? <span className="fruit-art-body fruit-art-body-second" /> : null}
      {kind === "strawberry" ? <span className="fruit-art-seeds" /> : null}
      <span className="fruit-art-stem" />
      <span className="fruit-art-leaf" />
    </span>
  );
}

export function BasketArt({ fruits = [], className = "", label = "Fruit basket" }: { fruits?: FruitArtKind[]; className?: string; label?: string }) {
  return (
    <span className={`basket-art ${className}`.trim()} role="img" aria-label={label}>
      <span className="basket-art-handle" />
      <span className="basket-art-fruits" aria-hidden="true">
        {fruits.slice(-5).map((fruit, index) => <FruitArt kind={fruit} key={`${fruit}-${index}`} />)}
      </span>
      <span className="basket-art-body" aria-hidden="true" />
    </span>
  );
}
