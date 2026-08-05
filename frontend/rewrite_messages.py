import os

with open('src/pages/Messages.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { api } from "../api/client";', 'import { api } from "../api/client";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('export default function Messages() {', 'export default function Messages() {\n  const { t } = useTranslation();'),
    ('<div className="muted">No conversations yet.</div>', '<div className="muted">{t("messages.noConversations", null, "No conversations yet.")}</div>'),
    ('placeholder="Search conversations…"', 'placeholder={t("messages.searchPlaceholder", null, "Search conversations…")}'),
    ('No conversations match "{q}".', '{t("messages.noMatch", { q }, `No conversations match "${q}".`)}'),
    ('Load more threads</button>', '{t("actions.loadMoreThreads", null, "Load more threads")}</button>'),
    ('Load previous</Btn>', '{t("actions.loadPrevious", null, "Load previous")}</Btn>'),
    ('aria-label="Attach file"', 'aria-label={t("actions.attachFile", null, "Attach file")}'),
    ('placeholder={`Message ${active.name}…`}', 'placeholder={t("messages.messagePlaceholder", { name: active.name }, `Message ${active.name}…`)}'),
    ('Send</Btn>', '{t("actions.send", null, "Send")}</Btn>')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/pages/Messages.jsx', 'w') as f:
    f.write(code)

print("Messages modified successfully")
