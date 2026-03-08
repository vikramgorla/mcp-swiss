# Retroactive PR Documentation: Real Estate Module

## Module: Real Estate / Property Price Index

### Tools
- `get_property_price_index` — Swiss Residential Property Price Index (BFS, Q4 2019 = 100)
- `search_real_estate_data` — search opendata.swiss for real estate datasets
- `get_rent_index` — Swiss CPI/rent index from Canton Zug open data

### API
- Source: opendata.swiss CKAN + data.zg.ch
- Data: Quarterly property index (embedded BFS data), monthly rent CPI
- Auth: None required (User-Agent header needed for opendata.swiss)
