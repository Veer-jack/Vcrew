import re

with open("src/data/onboarding.js", "r") as f:
    content = f.read()

# Replace VALIDATION_TYPES
val_replacement = """export const VALIDATION_TYPES = (t) => [
  { v: "idea", icon: "lightbulb", t: t("onboarding.opts.validationTypes.idea.t", null, "Idea"), d: t("onboarding.opts.validationTypes.idea.d", null, "Concept & positioning") },
  { v: "product", icon: "box", t: t("onboarding.opts.validationTypes.product.t", null, "Product"), d: t("onboarding.opts.validationTypes.product.d", null, "Features & experience") },
  { v: "app", icon: "phone", t: t("onboarding.opts.validationTypes.app.t", null, "Mobile app"), d: t("onboarding.opts.validationTypes.app.d", null, "iOS / Android flows") },
  { v: "web", icon: "browser", t: t("onboarding.opts.validationTypes.web.t", null, "Website"), d: t("onboarding.opts.validationTypes.web.d", null, "Landing & funnel") },
  { v: "saas", icon: "layout", t: t("onboarding.opts.validationTypes.saas.t", null, "SaaS platform"), d: t("onboarding.opts.validationTypes.saas.d", null, "Onboarding & retention") },
  { v: "ai", icon: "cpu", t: t("onboarding.opts.validationTypes.ai.t", null, "AI product"), d: t("onboarding.opts.validationTypes.ai.d", null, "Output quality & trust") },
  { v: "physical", icon: "cube", t: t("onboarding.opts.validationTypes.physical.t", null, "Physical product"), d: t("onboarding.opts.validationTypes.physical.d", null, "Form, fit & function") },
  { v: "packaging", icon: "image", t: t("onboarding.opts.validationTypes.packaging.t", null, "Packaging"), d: t("onboarding.opts.validationTypes.packaging.d", null, "Shelf appeal & clarity") },
  { v: "pricing", icon: "coins", t: t("onboarding.opts.validationTypes.pricing.t", null, "Pricing"), d: t("onboarding.opts.validationTypes.pricing.d", null, "Willingness to pay") },
  { v: "campaign", icon: "mic", t: t("onboarding.opts.validationTypes.campaign.t", null, "Marketing campaign"), d: t("onboarding.opts.validationTypes.campaign.d", null, "Message & creative") },
  { v: "cx", icon: "heart", t: t("onboarding.opts.validationTypes.cx.t", null, "Customer experience"), d: t("onboarding.opts.validationTypes.cx.d", null, "Support & journey") },
];"""

content = re.sub(
    r"export const VALIDATION_TYPES = \(t\) => \[.*?\];", 
    val_replacement, 
    content, 
    flags=re.DOTALL
)

# Replace COMPANY_LOOKING
comp_replacement = """export const COMPANY_LOOKING = (t) => [
  { v: "product-fb", icon: "box", t: t("onboarding.opts.companyLooking.productFb.t", null, "Product feedback"), d: t("onboarding.opts.companyLooking.productFb.d", null, "Features & experience") },
  { v: "product-test", icon: "settings", t: t("onboarding.opts.companyLooking.productTest.t", null, "Product testing"), d: t("onboarding.opts.companyLooking.productTest.d", null, "Hands-on trials") },
  { v: "customer-fb", icon: "heart", t: t("onboarding.opts.companyLooking.customerFb.t", null, "Customer feedback"), d: t("onboarding.opts.companyLooking.customerFb.d", null, "From real buyers") },
  { v: "packaging", icon: "image", t: t("onboarding.opts.companyLooking.packaging.t", null, "Packaging evaluation"), d: t("onboarding.opts.companyLooking.packaging.d", null, "Shelf appeal & clarity") },
  { v: "brand", icon: "star", t: t("onboarding.opts.companyLooking.brand.t", null, "Brand perception"), d: t("onboarding.opts.companyLooking.brand.d", null, "How you're seen") },
  { v: "pricing", icon: "coins", t: t("onboarding.opts.companyLooking.pricing.t", null, "Pricing validation"), d: t("onboarding.opts.companyLooking.pricing.d", null, "Willingness to pay") },
  { v: "ad", icon: "mic", t: t("onboarding.opts.companyLooking.ad.t", null, "Advertising feedback"), d: t("onboarding.opts.companyLooking.ad.d", null, "Message & creative") },
  { v: "ux", icon: "layout", t: t("onboarding.opts.companyLooking.ux.t", null, "UX evaluation"), d: t("onboarding.opts.companyLooking.ux.d", null, "Usability & flow") },
  { v: "csat", icon: "award", t: t("onboarding.opts.companyLooking.csat.t", null, "Customer satisfaction"), d: t("onboarding.opts.companyLooking.csat.d", null, "Loyalty studies") },
  { v: "market", icon: "chart", t: t("onboarding.opts.companyLooking.market.t", null, "Market research"), d: t("onboarding.opts.companyLooking.market.d", null, "Trends & demand") },
  { v: "focus", icon: "users", t: t("onboarding.opts.companyLooking.focus.t", null, "Focus groups"), d: t("onboarding.opts.companyLooking.focus.d", null, "Moderated discussion") },
  { v: "interview", icon: "phone", t: t("onboarding.opts.companyLooking.interview.t", null, "Interview participants"), d: t("onboarding.opts.companyLooking.interview.d", null, "1:1 conversations") },
  { v: "other-c", icon: "plus", t: t("onboarding.opts.companyLooking.other.t", null, "Other"), d: t("onboarding.opts.companyLooking.other.d", null, "Something else") },
];"""

content = re.sub(
    r"export const COMPANY_LOOKING = \(t\) => \[.*?\];", 
    comp_replacement, 
    content, 
    flags=re.DOTALL
)

with open("src/data/onboarding.js", "w") as f:
    f.write(content)

