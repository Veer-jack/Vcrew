// The actual ValidationCrew logo mark (blue "VC" + green check), not a
// generic icon. Drop-in replacement for the old gradient-square + Icon
// "shield" placeholder used across login/onboarding/layout headers.
export function BrandMark({ size = 34 }) {
  return (
    <img
      src="/brand/vc-mark.png"
      alt="ValidationCrew"
      style={{ width: size, height: size, objectFit: "contain", flex: "none" }}
    />
  );
}

export function BrandLogoFull({ height = 32 }) {
  return (
    <img
      src="/brand/vc-full-logo.png"
      alt="ValidationCrew"
      style={{ height, width: "auto", objectFit: "contain" }}
    />
  );
}
