# Localization architecture
- Resolve public deal and category text strictly from the selected locale; legacy deal source fields are Latvian-only because substituting source content leaks languages.
- Keep UI translations explicitly defined for LV/EN/RU and verify localization isolation with tests; language changes must synchronize document metadata and localized queries.