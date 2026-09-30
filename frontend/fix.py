import re

with open("src/data/personaConfig.jsx", "r") as f:
    content = f.read()

# 1. Insert StepLayout before StepHead
step_layout = """function StepLayout({ step, title, sub, children, d, showTrustProfile = true }) {
  return (
    <div className="rise" style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
      <div className="card" style={{ flex: 1, padding: "40px 48px", minWidth: 0 }}>
        {(step || title || sub) && (
          <div style={{ paddingBottom: 24, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
            {step && <div className="faint" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{step}</div>}
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px 0" }}>{title}</h2>
            {sub && <p className="muted" style={{ fontSize: 15, lineHeight: 1.5, margin: 0 }}>{sub}</p>}
          </div>
        )}
        {children}
      </div>
      {showTrustProfile && (
        <div style={{ width: 360, flexShrink: 0, position: "sticky", top: 100 }} className="hide-mobile">
          <TrustProfileWidget d={d} />
        </div>
      )}
    </div>
  );
}

"""

if "function StepLayout" not in content:
    content = content.replace("function StepHead", step_layout + "function StepHead")

# Now, we manually replace each known component's return block.
# We know they start with `return (\n    <div className="rise">\n      <StepHead`
# and end with `\n    </div>\n  );\n}`

def fix_component(comp_name):
    global content
    # Find the function definition
    func_pattern = r"(function " + comp_name + r"\s*\([^)]*\)\s*\{[\s\S]*?return \(\s*)\n\s*<div className=\"rise\">\s*<StepHead([^>]+)/>([\s\S]*?)\n\s*</div>\n\s*\);\n\}"
    match = re.search(func_pattern, content)
    if match:
        prefix = match.group(1)
        step_args = match.group(2)
        body = match.group(3)
        # Check if `d` is in scope, if so pass it. We will just pass `d={d}` safely.
        # Actually some use `d={props.d}` if they don't destructure. But all of them destructure `d`.
        d_prop = "d={d}"
        if comp_name in ["OrgAudience", "GenericAudience"]:
             # these have `const { d, ... } = props;`
             pass
        
        new_return = prefix + f"\n    <StepLayout{step_args} {d_prop}>\n" + body.strip("\n") + "\n    </StepLayout>\n  );\n}"
        content = content[:match.start()] + new_return + content[match.end():]
        print("Fixed", comp_name)
    else:
        print("Could not find", comp_name)

comps = [
    "FoPersonal", "FoCompany", "FoValidate",
    "CoPersonal", "CoCompany", "CoNeeds",
    "ResPersonal", "ResAcademic", "ResResearch", "ResParticipants", "ResEthics",
    "OrgRep", "OrgInfo", "OrgGoals", "OrgAudience", "OrgVerify",
    "GenericAudience", "GenericVerify"
]

for c in comps:
    fix_component(c)

with open("src/data/personaConfig.jsx", "w") as f:
    f.write(content)
