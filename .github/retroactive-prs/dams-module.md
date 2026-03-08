# Retroactive PR Documentation: Dams & Reservoirs Module

## Module: Swiss Dams & Reservoirs

### Tools
- `search_dams` — search by dam/reservoir name (falls back damname → reservoirname)
- `get_dams_by_canton` — list dams by canton via bbox filtering
- `get_dam_details` — full details with multilingual data

### API
- Source: BFE (Federal Office of Energy) via geo.admin.ch
- Layer: ch.bfe.stauanlagen-bundesaufsicht
- 201 dams under federal supervision
- Auth: None required
