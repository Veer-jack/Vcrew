import re

with open("/home/ravikiran/Desktop/Vcrew/frontend/src/vpages/VOnboarding.jsx", "r") as f:
    content = f.read()

# 1. Add VOnboardingLayout import
if "import VOnboardingLayout" not in content:
    content = content.replace("import React,", "import React, { useEffect } from \"react\";\nimport { useSearchParams } from \"react-router-dom\";\nimport VOnboardingLayout from \"./VOnboardingLayout\";\nimport React,")

# 2. Add searchParams logic and layout variables inside VOnboarding
if "const [searchParams] = useSearchParams();" not in content:
    content = content.replace("const type = TYPES.find(t => t.key === validatorType);", """const type = TYPES.find(t => t.key === validatorType);
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const role = searchParams.get("role");
    if (role && role !== validatorType) {
      setValidatorType(role);
    }
  }, [searchParams, validatorType, setValidatorType]);

  const roleName = type ? t("vOnboarding.types." + validatorType + ".title", null, type.title) : "";
  const layoutColor = type?.color || "var(--accent)";
""")

# 3. Replace the return block
return_block_regex = r"return \(\s*<div style=\{\{ minHeight: \"100vh\".*?</aside>\s*<div style=\{\{ display: \"flex\", flexDirection: \"column\", alignItems: \"center\", justifyContent: \"center\", padding: \"40px 24px\", overflowY: \"auto\" \}\}>\s*(.*?)\s*</div>\s*</div>\s*\);"

replacement = """return (
    <VOnboardingLayout
      roleName={roleName}
      color={layoutColor}
      steps={stepLabelsFor(t, validatorType)}
      currentStep={step}
      maxReached={maxReached}
      onJump={jumpToStep}
      onBack={goBack}
      onSkip={skip}
      onNext={saveNow}
      formId="v-onboarding-form"
      nextLabel={step === totalSteps - 1 ? (validatorType === "tester" || validatorType === "validator" ? t("vOnboarding.actions.seeMyOpportunities", null, "See my opportunities") : t("vOnboarding.actions.completeSetup", null, "Complete setup")) : t("vOnboarding.actions.continue", null, "Continue")}
    >
      \\1
    </VOnboardingLayout>
  );"""

content = re.sub(return_block_regex, replacement, content, flags=re.DOTALL)

with open("/home/ravikiran/Desktop/Vcrew/frontend/src/vpages/VOnboarding.jsx", "w") as f:
    f.write(content)
