import os

with open('src/pages/Wallet.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { exportCSV } from "../exportUtils";', 'import { exportCSV } from "../exportUtils";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('const TABS = [\n  { k: "transactions", l: "Transaction history", ic: "list" },\n  { k: "invoices", l: "Invoices", ic: "fileText" },\n  { k: "methods", l: "Payment methods", ic: "creditCard" },\n];', '// TABS defined in component'),
    ('export default function Wallet() {', 'export default function Wallet() {\n  const { t } = useTranslation();\n  const TABS = [\n    { k: "transactions", l: t("wallet.tabTransactions", null, "Transaction history"), ic: "list" },\n    { k: "invoices", l: t("wallet.tabInvoices", null, "Invoices"), ic: "fileText" },\n    { k: "methods", l: t("wallet.tabMethods", null, "Payment methods"), ic: "creditCard" },\n  ];'),
    ('Couldn\'t load payment widget', 't("wallet.errPaymentWidget", null, "Couldn\'t load payment widget")'),
    ('Couldn\'t load your wallet', 't("wallet.errLoadWallet", null, "Couldn\'t load your wallet")'),
    ('Retry</Btn>', '{t("actions.retry", null, "Retry")}</Btn>'),
    ('<div className="muted">Loading…</div>', '<div className="muted">{t("actions.loading", null, "Loading…")}</div>'),
    ('Wallet top-up', 't("wallet.walletTopup", null, "Wallet top-up")'),
    ('Payment received — your wallet has been topped up.', 't("wallet.paymentReceived", null, "Payment received — your wallet has been topped up.")'),
    ('Couldn\'t verify payment', 't("wallet.errVerifyPayment", null, "Couldn\'t verify payment")'),
    ('Couldn\'t start checkout', 't("wallet.errStartCheckout", null, "Couldn\'t start checkout")'),
    ('Couldn\'t add funds', 't("wallet.errAddFunds", null, "Couldn\'t add funds")'),
    ('"Date", "Description", "Type", "Amount"', 't("wallet.thDate", null, "Date"), t("wallet.thDescription", null, "Description"), t("wallet.thType", null, "Type"), t("wallet.thAmount", null, "Amount")'),
    ('<span className="eyebrow">Wallet &amp; billing</span>', '<span className="eyebrow">{t("wallet.walletAndBilling", null, "Wallet & billing")}</span>'),
    ('<h1>Wallet</h1>', '<h1>{t("wallet.title", null, "Wallet")}</h1>'),
    ('<p className="lead">Top up, track mission spend and manage how {builder?.org} pays.</p>', '<p className="lead">{t("wallet.lead", { org: builder?.org }, `Top up, track mission spend and manage how ${builder?.org} pays.`)}</p>'),
    ('Statement</Btn>', '{t("actions.statement", null, "Statement")}</Btn>'),
    ('Add funds</Btn>', '{t("actions.addFunds", null, "Add funds")}</Btn>'),
    ('<label>Amount to add</label>', '<label>{t("wallet.amountToAdd", null, "Amount to add")}</label>'),
    ('{busy ? "Opening…" : "Pay with card / UPI"}', '{busy ? t("actions.opening", null, "Opening…") : t("actions.payWithCardUpi", null, "Pay with card / UPI")}'),
    ('{busy ? "Adding…" : "Add to wallet"}', '{busy ? t("actions.adding", null, "Adding…") : t("actions.addToWallet", null, "Add to wallet")}'),
    ('Cancel</Btn>', '{t("actions.cancel", null, "Cancel")}</Btn>'),
    ('Online payments aren\'t set up yet — this adds funds directly for testing.', '{t("wallet.onlinePaymentsNotSetup", null, "Online payments aren\'t set up yet — this adds funds directly for testing.")}'),
    ('title="Verify wallet top-up"', 'title={t("wallet.verifyWalletTopup", null, "Verify wallet top-up")}'),
    ('<div className="bc-lab">Available balance</div>', '<div className="bc-lab">{t("wallet.availableBalance", null, "Available balance")}</div>'),
    ('<div className="l">In escrow</div>', '<div className="l">{t("wallet.inEscrow", null, "In escrow")}</div>'),
    ('<div className="l">This month</div>', '<div className="l">{t("wallet.thisMonth", null, "This month")}</div>'),
    ('label="Total spend (all time)"', 'label={t("wallet.totalSpendAllTime", null, "Total spend (all time)")}'),
    ('label="Pending charges"', 'label={t("wallet.pendingCharges", null, "Pending charges")}'),
    ('<th>Date</th>', '<th>{t("wallet.thDate", null, "Date")}</th>'),
    ('<th>Description</th>', '<th>{t("wallet.thDescription", null, "Description")}</th>'),
    ('<th>Type</th>', '<th>{t("wallet.thType", null, "Type")}</th>'),
    ('<th style={{ textAlign: "right" }}>Amount</th>', '<th style={{ textAlign: "right" }}>{t("wallet.thAmount", null, "Amount")}</th>'),
    ('{t.type === "credit" ? "Credit" : "Debit"}', '{t.type === "credit" ? t("wallet.credit", null, "Credit") : t("wallet.debit", null, "Debit")}'),
    ('Load more transactions</Btn>', '{t("actions.loadMoreTransactions", null, "Load more transactions")}</Btn>'),
    ('<th>Invoice</th>', '<th>{t("wallet.thInvoice", null, "Invoice")}</th>'),
    ('title="Download"', 'title={t("actions.download", null, "Download")}'),
    ('Load more invoices</Btn>', '{t("actions.loadMoreInvoices", null, "Load more invoices")}</Btn>'),
    ('`Expires ${p.exp}`', 't("wallet.expires", { exp: p.exp }, `Expires ${p.exp}`)'),
    ('"UPI handle"', 't("wallet.upiHandle", null, "UPI handle")'),
    ('Primary</span>', '{t("wallet.primary", null, "Primary")}</span>'),
    ('Add payment method</Btn>', '{t("actions.addPaymentMethod", null, "Add payment method")}</Btn>'),
    ('<span className="eyebrow">Billing summary</span>', '<span className="eyebrow">{t("wallet.billingSummary", null, "Billing summary")}</span>'),
    ('<span className="lab">Plan</span>', '<span className="lab">{t("wallet.plan", null, "Plan")}</span>'),
    ('<span className="lab">Billing cycle</span>', '<span className="lab">{t("wallet.billingCycle", null, "Billing cycle")}</span>'),
    ('<span className="v">Monthly</span>', '<span className="v">{t("wallet.monthly", null, "Monthly")}</span>'),
    ('<span className="lab">Next invoice</span>', '<span className="lab">{t("wallet.nextInvoice", null, "Next invoice")}</span>')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/pages/Wallet.jsx', 'w') as f:
    f.write(code)

print("Wallet modified successfully")
