# Retroactive PR Documentation: SNB Exchange Rates Module

This file documents the SNB Exchange Rates module added in this feature branch.
Created retroactively for traceability.

## Module: SNB Exchange Rates

### Tools
- `list_currencies` — 28 SNB-tracked currencies
- `get_exchange_rate` — latest monthly average rate for any currency vs CHF
- `get_exchange_rate_history` — monthly history with date filtering + stats

### API
- Source: Swiss National Bank (data.snb.ch)
- Format: CSV (semicolon-delimited)
- Auth: None required
