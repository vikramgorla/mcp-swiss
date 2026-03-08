/**
 * Mock pipe-delimited FDSN text responses for earthquake tests.
 */

// Header + 5 events (mix of earthquakes and one quarry blast)
export const mockFdsnTextMulti = `#EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType
smi:ch.ethz.sed/sc25a/Event/2026errxzt|2026-03-08T07:02:15.702386|46.17832923827476|7.486495048597488|3.2467773437500007|tdiehl@sc25ag||SED|smi:ch.ethz.sed/sc25a/Event/2026errxzt|MLhc|0.5201420184212165|tdiehl@sc25ag|Sion VS|earthquake
smi:ch.ethz.sed/sc25a/Event/2026eraanf|2026-03-07T22:02:10.034717|46.68463720900495|7.224922836397186|6.901269531250003|tdiehl@sc25ag||SED|smi:ch.ethz.sed/sc25a/Event/2026eraanf|MLhc|0.8258324451839436|tdiehl@sc25ag|Schwarzsee FR|earthquake
smi:ch.ethz.sed/sc25a/Event/2026eqvwbu|2026-03-07T19:56:21.243367|46.48203216008705|7.884721896805642|-2.30263671875|tdiehl@sc25ag||SED|smi:ch.ethz.sed/sc25a/Event/2026eqvwbu|MLhc|0.8599838368147636|tdiehl@sc25ag|Muerren BE|earthquake
smi:ch.ethz.sed/sc25a/Event/2026eptrly|2026-03-07T05:46:06.506763|45.89355658618459|7.012713772406021|5.736279296875002|tdiehl@sc25ag||SED|smi:ch.ethz.sed/sc25a/Event/2026eptrly|MLhc|0.5230838687823112|tdiehl@sc25ag|Chamonix F|earthquake
smi:ch.ethz.sed/sc25a/Event/2026eogyqj|2026-03-06T10:18:16.598458|46.30316669265851|9.114578935278521|1.0811523437500004|jozinovic@sc25ag||SED|smi:ch.ethz.sed/sc25a/Event/2026eogyqj|MLhc|0.7111092380241185|jozinovic@sc25ag|Roveredo GR|quarry blast`;

// Header + 1 earthquake only
export const mockFdsnTextSingle = `#EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType
smi:ch.ethz.sed/sc25a/Event/2026errxzt|2026-03-08T07:02:15.702386|46.17832923827476|7.486495048597488|3.2467773437500007|tdiehl@sc25ag||SED|smi:ch.ethz.sed/sc25a/Event/2026errxzt|MLhc|0.5201420184212165|tdiehl@sc25ag|Sion VS|earthquake`;

// Empty — no events (after header)
export const mockFdsnTextEmpty = `#EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType`;

// Header-only (just a blank comment)
export const mockFdsnTextHeaderOnly = `#EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType\n`;

// Rows with insufficient fields (should be skipped)
export const mockFdsnTextMalformed = `#EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType
only|five|fields|here|done
smi:ch.ethz.sed/sc25a/Event/2026errxzt|2026-03-08T07:02:15.702386|46.17832923827476|7.486495048597488|3.2467773437500007|tdiehl@sc25ag||SED|smi:ch.ethz.sed/sc25a/Event/2026errxzt|MLhc|0.5201420184212165|tdiehl@sc25ag|Sion VS|earthquake`;

// All quarry blasts
export const mockFdsnTextAllBlasts = `#EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType
smi:ch.ethz.sed/sc25a/Event/2026blast1|2026-03-06T10:18:16.598458|46.30316669265851|9.114578935278521|1.0811523437500004|jozinovic@sc25ag||SED|smi:ch.ethz.sed/sc25a/Event/2026blast1|MLhc|0.7111092380241185|jozinovic@sc25ag|Roveredo GR|quarry blast
smi:ch.ethz.sed/sc25a/Event/2026blast2|2026-03-05T08:00:00.000000|47.00000000000000|8.000000000000000|1.0000000000000000|author@test||SED|smi:ch.ethz.sed/sc25a/Event/2026blast2|MLhc|1.2|author@test|Somewhere CH|quarry blast`;

// Location search result (2 events near Bern)
export const mockFdsnTextNearBern = `#EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType
smi:ch.ethz.sed/sc25a/Event/2026bernA|2026-03-05T10:00:00.000000|46.9000000000|7.5000000000|5.0|author@test||SED|smi:ch.ethz.sed/sc25a/Event/2026bernA|MLhc|1.1|author@test|Bern BE|earthquake
smi:ch.ethz.sed/sc25a/Event/2026bernB|2026-03-04T08:00:00.000000|46.8500000000|7.4000000000|3.0|author@test||SED|smi:ch.ethz.sed/sc25a/Event/2026bernB|MLhc|0.9|author@test|Köniz BE|earthquake`;

// Rows where depth / magnitude are NaN (should be skipped by parser)
export const mockFdsnTextNanFields = `#EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType
smi:ch.ethz.sed/sc25a/Event/2026nan|2026-03-08T07:02:15.702386|46.178|7.486|NOT_A_NUMBER|tdiehl@sc25ag||SED|smi:ch.ethz.sed/sc25a/Event/2026nan|MLhc|NOT_A_NUMBER|tdiehl@sc25ag|Test|earthquake`;
