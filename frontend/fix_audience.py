import re

with open("src/data/personaConfig.jsx", "r") as f:
    content = f.read()

# Remove case "audience": ... from *Valid and *StepIssue
content = re.sub(r'\s*case\s*"audience":\s*return\s*audienceStepValid\(d\);\n', '', content)
content = re.sub(r'\s*case\s*"audience":\s*return\s*firstMissingField\(audienceChecks\(d,\s*t\),\s*t\);\n', '', content)
content = re.sub(r'\s*case\s*"audience":\s*{\s*const ok = [^\}]+\}\n', '', content)

# Remove audience step from steps array for founder
content = re.sub(r'\s*\{\s*key:\s*"audience",\s*label:\s*"Audience"\s*\},\n', '\n', content)

# Write back
with open("src/data/personaConfig.jsx", "w") as f:
    f.write(content)
