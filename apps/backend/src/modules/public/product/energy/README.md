# Product: Energie

Sleep, training, food and rest. Tracked because the product claims they are the
floor under financial decisions — *"een moe hoofd geeft uit; een uitgerust hoofd
stuurt"* — not as lifestyle extras.

| Child | Owns |
|---|---|
| `log/` | daily readings per metric, normalised 0..100, one row per user/day/metric |
| `time/` | daily minutes per HETUS-derived activity category, one row per user/day/category; weekly summary against evidence bands |
| `time-template/` | a person's typical workday / day off (weekdays + minutes); `list` adds the median of their own logged days as a learned default |

Time bands live in `@rumtelo/contracts` (`TIME_REFERENCE`) with their sources. They
are built from more than one continent on purpose: Canada/WHO set most targets,
Japan's MHLW and hunter-gatherer sleep studies set the floors lower, African
time-use surveys supply the unpaid-work lens. Categories with no defensible
number carry `band: null` and must be shown as "your target", never as health advice.

`spendCorrelation` stays `null` until there is enough paired data. A correlation
computed from a handful of points is noise dressed as insight, which is exactly
what this product promises not to do.
