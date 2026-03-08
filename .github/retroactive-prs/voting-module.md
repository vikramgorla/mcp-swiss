# Retroactive PR Documentation: Voting Results Module

## Module: Swiss Voting Results

### Tools
- `get_voting_results` — Swiss popular vote results with yes/no counts
- `search_votes` — keyword search in vote titles
- `get_vote_details` — per-district breakdown (Basel-Stadt)

### API
- Source: data.bs.ch (Basel-Stadt open data, dataset 100345)
- Data: National & cantonal votes since 2023
- Auth: None required (User-Agent header needed)
