"""Convert simple metadata exports to generateMetadata + pages.meta keys."""
from __future__ import annotations

import re
from pathlib import Path

TITLE_TO_KEY = {
    "Home": "home",
    "Money": "money",
    "Jars": "jars",
    "Jar": "jar",
    "Transactions": "transactions",
    "Transaction": "transaction",
    "Debts": "debts",
    "Debt": "debt",
    "Fixed costs": "fixed_costs",
    "Fixed cost": "fixed_cost",
    "Week check": "week_check",
    "Growth · overview": "growth",
    "Goals": "goals",
    "Goal": "goal",
    "My income": "income",
    "Learn": "learn",
    "Library": "library",
    "Net worth": "net_worth",
    "Asset": "asset",
    "Energy · overview": "energy",
    "Soul · overview": "soul",
    "Gratitude": "gratitude",
    "Sign in": "sign_in",
    "Account — Settings": "settings_account",
    "Export — Settings": "settings_export",
    "Week — Settings": "settings_week",
    "Goals — Settings": "settings_goals",
    "Stillness — Settings": "settings_stillness",
    "Automation settings": "settings_automation",
    "Debt — Settings": "settings_debt",
    "Bank — Settings": "settings_bank",
    "Jars — Settings": "settings_jars",
    "Create account": "create_account",
    "Forgot password": "forgot_password",
    "Verify email": "verify_email",
    "Reset password": "reset_password",
}

PATTERN = re.compile(
    r"export const metadata = \{\s*title:\s*'([^']+)'\s*\};",
    re.M,
)


def ensure_get_translations_import(text: str) -> str:
    if "getTranslations" in text and "@rumtelo/i18n" in text:
        # already imported somehow
        if re.search(r"import\s*\{[^}]*getTranslations[^}]*\}\s*from\s*'@rumtelo/i18n'", text):
            return text

    # If there is an existing @rumtelo/i18n import, add getTranslations to it
    m = re.search(r"import\s*\{([^}]+)\}\s*from\s*'@rumtelo/i18n';", text)
    if m:
        names = [x.strip() for x in m.group(1).split(",") if x.strip()]
        if "getTranslations" not in names:
            names.append("getTranslations")
        new_import = "import { " + ", ".join(names) + " } from '@rumtelo/i18n';"
        return text[: m.start()] + new_import + text[m.end() :]

    return "import { getTranslations } from '@rumtelo/i18n';\n" + text


def main() -> None:
    changed: list[str] = []
    for root in (Path("apps/application"), Path("apps/website")):
        for path in root.rglob("page.tsx"):
            text = path.read_text()
            m = PATTERN.search(text)
            if not m:
                continue
            title = m.group(1)
            key = TITLE_TO_KEY.get(title)
            if not key:
                print("skip unmapped", path, repr(title))
                continue
            if "generateMetadata" in text:
                print("already", path)
                continue

            text = ensure_get_translations_import(text)
            replacement = (
                "export async function generateMetadata() {\n"
                "    const t = await getTranslations('pages.meta');\n"
                f"    return {{ title: t('{key}') }};\n"
                "}"
            )
            text = PATTERN.sub(replacement, text, count=1)
            path.write_text(text)
            changed.append(str(path))

    print("changed", len(changed))
    for c in changed:
        print(c)


if __name__ == "__main__":
    main()
