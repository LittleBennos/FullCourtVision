# PlayHQ GraphQL API Notes

## Endpoint
`https://api.playhq.com/graphql`

## Authentication
None required. Public API.

## Required Headers
```
Content-Type: application/json
tenant: basketball-victoria
origin: https://www.playhq.com
user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

## Introspection
Disabled (`INTROSPECTION_DISABLED`). Schema reverse-engineered via error messages.

## Discovered Queries

### discoverOrganisations
```graphql
discoverOrganisations(filter: { limit: Int!, page: Int! }) {
  results { id name type }
  meta { totalPages totalRecords page }
}
```
Returns paginated list of all basketball organisations. 887 in Victoria.

### discoverCompetitions
```graphql
discoverCompetitions(organisationID: ID!) {
  id name
  seasons(organisationID: ID!) {
    id name startDate endDate status { value }
  }
}
```
Note: `seasons` requires `organisationID` as an argument (not just parent resolution).

### discoverSeason
```graphql
discoverSeason(seasonID: String!) {
  id name grades { id name type }
}
```

### discoverGrade
```graphql
discoverGrade(gradeID: ID!) {
  id name type hideScores dates
  rounds { id name number isFinalsRound provisionalDates }
  season { id name competition { id name organisation { id name } } }
}
```

### gradePlayerStatistics
```graphql
gradePlayerStatistics(gradeID: ID!, filter: GradePlayerStatisticsFilter) {
  meta { page totalPages totalRecords }
  results {
    ranking
    profile { id firstName lastName }
    team { name }
    statistics { count details { value } }
  }
}
```
Filter: `{ sort: [{ column: "APPEARANCE", direction: "DESC" }], pagination: { page: Int, limit: Int } }`

Statistic values: `APPEARANCE`, `TOTAL_SCORE`, `1_POINT_SCORE`, `2_POINT_SCORE`, `3_POINT_SCORE`, `TOTAL_FOULS`

### discoverFixtureByRound
```graphql
discoverFixtureByRound(roundID: ID!) {
  byes { id name }
  games {
    id
    home { ... on DiscoverTeam { id name } }
    away { ... on DiscoverTeam { id name } }
    result { home { score } away { score } }
    status { value }
    date
    allocation { time court { name venue { name address suburb } } }
  }
}
```

### discoverTeams
```graphql
discoverTeams(filter: { seasonID: ID! }) {
  id name organisation { id name }
}
```

### discoverTeamFixture
```graphql
discoverTeamFixture(teamID: ID!) {
  id name provisionalDate
  fixture { games { id home { id name } away { id name } result { home { score } away { score } } } }
}
```

### discoverOrganisation
```graphql
discoverOrganisation(code: String!) {
  id name type email contactNumber websiteUrl
  address { line1 suburb postcode state }
  logo { sizes { url dimensions { width height } } }
  contacts { firstName lastName position email phone }
}
```
Note: `code` can be the org ID (e.g., "f266ce8b").

### discoverGame
```graphql
discoverGame(gameID: ID!) { ... }
```
Teams use `DiscoverPossibleTeam` union — need inline fragments for `DiscoverTeam` and `ProvisionalTeam`.

## Key IDs

### Organisations
- EDJBA: `0c8a84ea`
- Eltham Wildcats Association: `f266ce8b`
- Eltham Wildcats Club: `2b434ebe`
- Diamond Valley BA: `4ba8bc5d`
- Doncaster BA: `02357c83`

## Rate Limiting
No explicit rate limits observed, but be respectful. The API serves the PlayHQ/MyHoops mobile app and website.
Recommend: 100-200ms delay between requests.
