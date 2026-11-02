/**
 * Fixtures for the SLF avalanche bulletin module.
 *
 * Captured from https://aws.slf.ch/api/bulletin/caaml/en/json?activeAt=…
 * The bulletins are real; the region lists and the forecast prose are cut down,
 * and the geojson outline is the real Valais outline decimated to 22 points.
 */

/** Two bulletins from the 2026-02-10 morning edition (CAAMLv6). */
export const winterBulletins = {
  "bulletins": [
    {
      "bulletinID": "efb33670-40e7-4071-a5ae-d67011906e0a",
      "validTime": {
        "startTime": "2026-02-10T07:00:00Z",
        "endTime": "2026-02-10T16:00:00Z"
      },
      "nextUpdate": "2026-02-10T16:00:00Z",
      "publicationTime": "2026-02-10T07:00:00Z",
      "lang": "en",
      "unscheduled": false,
      "regions": [
        {
          "regionID": "CH-7114",
          "name": "St. Moritz"
        },
        {
          "regionID": "CH-7222",
          "name": "unteres Puschlav"
        },
        {
          "regionID": "CH-7231",
          "name": "Münstertal"
        },
        {
          "regionID": "CH-7126",
          "name": "Val S-charl"
        }
      ],
      "dangerRatings": [
        {
          "mainValue": "considerable",
          "validTimePeriod": "all_day",
          "customData": {
            "CH": {
              "subdivision": "plus"
            }
          }
        }
      ],
      "avalancheProblems": [
        {
          "problemType": "persistent_weak_layers",
          "dangerRatingValue": "considerable",
          "elevation": {
            "lowerBound": 2000,
            "upperBound": null
          },
          "aspects": [
            "N",
            "NE",
            "E",
            "SE",
            "W",
            "NW"
          ],
          "validTimePeriod": "all_day",
          "customData": {
            "CH": {
              "subdivision": "plus",
              "coreZoneText": "Danger level \"considerable\" (3+) in west to northeast to southeast facing aspects above 2000m."
            }
          },
          "comment": "Distinct weak layers in the old snowpack necessitate caution and restraint. Avalanches can be triggered in deep layers and reach large size in isolated cases. The avalanche prone locations are prevalent. Remotely triggered avalanches are to be expected. Whumpfing sounds and the formation of shooting cracks when stepping on the snowpack and fresh avalanches indicate the danger. <br/> Backcountry touring and other off-piste activities call for extensive experience in the assessment of avalanche danger and restraint."
        }
      ],
      "customData": {
        "CH": {
          "aggregation": [
            {
              "category": "dry",
              "validTimePeriod": "all_day",
              "problemTypes": [
                "persistent_weak_layers"
              ]
            }
          ]
        }
      },
      "weatherForecast": {
        "comment": "<h1>Weather forecast to Tuesday</h1><p>In the north, conditions will range from cloudy with bright intervals to very cloudy, with the brighter intervals primarily occurring in the Visp valleys and Grisons. In the south, conditions will be very cloudy. Some precipitation is expected, especially in the west and south. The snowfall level will be between 1000 and 1500 m.</p>"
      },
      "snowpackStructure": {
        "comment": "<h1>Snowpack</h1><p>Snowpack structure is unfavourable in many locations in southern Valais, Ticino and Grisons, with distinct weak layers that are prone to triggering in the middle and lower part of the snowpack. Whumpfing sounds and avalanches triggered by human activity, often remotely, continue to be reported from these regions. Snowpack structure is somewhat more favourable on the northern flank of the Alps and in northern Valais, but there are weak layers deeper in the snowpack in these re"
      },
      "tendency": [
        {
          "comment": "<h1>Outlook for Wednesday and Thursday</h1><p>On the southern flank of the Alps, both days will see cloudy skies with bright intervals and some precipitation. In the north, conditions will be very cloudy, with repeated precipitation, which will be centred in particular in the west and on the norther"
        }
      ]
    },
    {
      "bulletinID": "a6fedb05-01ea-4676-83d8-9131d72fc568",
      "validTime": {
        "startTime": "2026-02-10T07:00:00Z",
        "endTime": "2026-02-10T16:00:00Z"
      },
      "nextUpdate": "2026-02-10T16:00:00Z",
      "publicationTime": "2026-02-10T07:00:00Z",
      "lang": "en",
      "unscheduled": false,
      "regions": [
        {
          "regionID": "CH-5123",
          "name": "Davos"
        },
        {
          "regionID": "CH-5215",
          "name": "Val Sumvitg"
        },
        {
          "regionID": "CH-4242",
          "name": "Binntal"
        },
        {
          "regionID": "CH-7123",
          "name": "Sur Tasna"
        }
      ],
      "dangerRatings": [
        {
          "mainValue": "considerable",
          "validTimePeriod": "all_day",
          "customData": {
            "CH": {
              "subdivision": "neutral"
            }
          }
        }
      ],
      "avalancheProblems": [
        {
          "problemType": "persistent_weak_layers",
          "dangerRatingValue": "considerable",
          "elevation": {
            "lowerBound": 2200,
            "upperBound": null
          },
          "aspects": [
            "N",
            "NE",
            "E",
            "SE",
            "W",
            "NW"
          ],
          "validTimePeriod": "all_day",
          "customData": {
            "CH": {
              "subdivision": "neutral",
              "coreZoneText": "Danger level \"considerable\" (3=) in west to northeast to southeast facing aspects above 2200m."
            }
          },
          "comment": "Weak layers in the old snowpack necessitate caution. Even single snow sport participants can release avalanches. These can be triggered in deep layers and reach large size in isolated cases. Remotely triggered avalanches are possible. Whumpfing sounds and the formation of shooting cracks when stepping on the snowpack and fresh avalanches can indicate the danger. <br/> Backcountry touring and other off-piste activities call for extensive experience in the assessment of avalanche danger."
        }
      ],
      "customData": {
        "CH": {
          "aggregation": [
            {
              "category": "dry",
              "validTimePeriod": "all_day",
              "problemTypes": [
                "persistent_weak_layers"
              ]
            }
          ]
        }
      },
      "weatherForecast": {
        "comment": "<h1>Weather forecast to Tuesday</h1><p>In the north, conditions will range from cloudy with bright intervals to very cloudy, with the brighter intervals primarily occurring in the Visp valleys and Grisons. In the south, conditions will be very cloudy. Some precipitation is expected, especially in the west and south. The snowfall level will be between 1000 and 1500 m.</p>"
      },
      "snowpackStructure": {
        "comment": "<h1>Snowpack</h1><p>Snowpack structure is unfavourable in many locations in southern Valais, Ticino and Grisons, with distinct weak layers that are prone to triggering in the middle and lower part of the snowpack. Whumpfing sounds and avalanches triggered by human activity, often remotely, continue to be reported from these regions. Snowpack structure is somewhat more favourable on the northern flank of the Alps and in northern Valais, but there are weak layers deeper in the snowpack in these re"
      },
      "tendency": [
        {
          "comment": "<h1>Outlook for Wednesday and Thursday</h1><p>On the southern flank of the Alps, both days will see cloudy skies with bright intervals and some precipitation. In the north, conditions will be very cloudy, with repeated precipitation, which will be centred in particular in the west and on the norther"
        }
      ]
    }
  ],
  "customData": {
    "CH": {
      "base": "c9a44469-85f1-4d38-b7b6-fd3e426c458f:33"
    }
  }
};

/** 2026-04-10: danger rises during the day, so there is an "all_day" and a "later" rating. */
export const springBulletin = {
  "bulletins": [
    {
      "bulletinID": "3b9ab5b5-1827-434d-ba1d-f2199617fcfd",
      "validTime": {
        "startTime": "2026-04-10T06:00:00Z",
        "endTime": "2026-04-10T15:00:00Z"
      },
      "nextUpdate": "2026-04-10T15:00:00Z",
      "publicationTime": "2026-04-10T06:00:00Z",
      "lang": "en",
      "unscheduled": false,
      "regions": [
        {
          "regionID": "CH-1311",
          "name": "Vouvry"
        },
        {
          "regionID": "CH-1213",
          "name": "Hohgant"
        },
        {
          "regionID": "CH-1225",
          "name": "Iffigen"
        }
      ],
      "dangerRatings": [
        {
          "mainValue": "low",
          "validTimePeriod": "all_day",
          "customData": {
            "CH": {
              "subdivision": null
            }
          }
        },
        {
          "mainValue": "considerable",
          "validTimePeriod": "later",
          "customData": {
            "CH": {
              "subdivision": null
            }
          }
        }
      ],
      "avalancheProblems": [
        {
          "problemType": "no_distinct_avalanche_problem",
          "dangerRatingValue": "low",
          "elevation": {
            "lowerBound": 2000,
            "upperBound": null
          },
          "aspects": [
            "N",
            "NE",
            "E",
            "W",
            "NW"
          ],
          "validTimePeriod": "all_day",
          "customData": {
            "CH": {
              "subdivision": null,
              "coreZoneText": "Danger level \"low\" (1) in west to north to east facing aspects above 2000m."
            }
          },
          "comment": "Individual avalanche prone locations for dry avalanches are to be found in particular in extremely steep terrain. <br/> Apart from the danger of being buried, restraint should be exercised in particular in view of the danger of avalanches sweeping people along and giving rise to falls."
        },
        {
          "problemType": "wet_snow",
          "dangerRatingValue": "considerable",
          "elevation": null,
          "aspects": [],
          "validTimePeriod": "later",
          "customData": {
            "CH": {
              "subdivision": null
            }
          },
          "comment": "At high altitude the snowpack is frozen but the crust is only thin. <br/> As the day progresses as a consequence of warming during the day and solar radiation there will be an appreciable increase in the danger of wet and gliding avalanches. This applies in particular on steep sunny slopes between approximately 2000 and 3000 m, as well as on steep north facing slopes between approximately 1600 and 2400 m. Natural avalanches are to be expected. Wet avalanches can additionally in some places be released by people. Isolated whumpfing sounds can indicate the danger. Avalanches can reach large size. <br/> Backcountry tours should be started early and concluded timely."
        }
      ],
      "customData": {
        "CH": {
          "aggregation": [
            {
              "category": "dry",
              "validTimePeriod": "all_day",
              "problemTypes": [
                "no_distinct_avalanche_problem"
              ],
              "title": "Dry avalanches, whole day"
            },
            {
              "category": "wet",
              "validTimePeriod": "later",
              "problemTypes": [
                "wet_snow"
              ],
              "title": "Wet-snow avalanches, as the day progresses"
            }
          ]
        }
      },
      "weatherForecast": {
        "comment": "<h1>Weather forecast to Friday</h1><p>The night will be partly clear. During the day, it will be partly sunny in the west and in the south. On the northern flank of the Alps from the eastern Bernese Oberland to Liechtenstein and in northern Grisons, it will be heavily overcast during the day, and a small amount of snow will fall above 2200 m.</p>"
      },
      "snowpackStructure": {
        "comment": "<h1>Snowpack</h1><p>Weak layers in the upper part of the snowpack can in some cases still be triggered by human activity. Such avalanche-prone locations are to be found on still dry north-facing slopes at high altitudes and on sunny slopes that are being moistened for the first time. The likelihood of triggering increases during the course of each day. Deeper in the snowpack there are faceted layers, which in isolated cases are still prone to triggering on slopes with little snow that are little"
      },
      "tendency": [
        {
          "comment": "<h1>Outlook</h1><h2>Saturday</h2><p>After a quite clear night, it will be sunny and mild. The zero-degree level will increase back up to 3000 m and the wind will mostly be light.</p>"
        }
      ]
    }
  ]
};

/** The geojson form of the same feed, for the coordinate lookup. */
export const winterGeojson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 0,
      "properties": {
        "bulletinID": "bf190299-631a-4765-a872-17464f0f54fb",
        "validTime": {
          "startTime": "2026-02-10T07:00:00Z",
          "endTime": "2026-02-10T16:00:00Z"
        },
        "nextUpdate": "2026-02-10T16:00:00Z",
        "publicationTime": "2026-02-10T07:00:00Z",
        "lang": "en",
        "unscheduled": false,
        "regions": [
          {
            "regionID": "CH-5112",
            "name": "südliches Prättigau"
          },
          {
            "regionID": "CH-4222",
            "name": "Zermatt"
          },
          {
            "regionID": "CH-4225",
            "name": "Mattmark"
          },
          {
            "regionID": "CH-4232",
            "name": "südliches Simplon Gebiet"
          },
          {
            "regionID": "CH-4223",
            "name": "Saas Fee"
          },
          {
            "regionID": "CH-4125",
            "name": "Mountet"
          },
          {
            "regionID": "CH-4116",
            "name": "Haut Val de Bagnes"
          },
          {
            "regionID": "CH-5111",
            "name": "nördliches Prättigau"
          },
          {
            "regionID": "CH-4224",
            "name": "Monte Rosa"
          },
          {
            "regionID": "CH-4123",
            "name": "Arolla"
          }
        ],
        "dangerRatings": [
          {
            "mainValue": "considerable",
            "validTimePeriod": "all_day",
            "customData": {
              "CH": {
                "subdivision": "minus"
              }
            }
          }
        ],
        "avalancheProblems": [
          {
            "problemType": "persistent_weak_layers",
            "dangerRatingValue": "considerable",
            "elevation": {
              "lowerBound": 2200,
              "upperBound": null
            },
            "aspects": [
              "N",
              "NE",
              "E",
              "SE",
              "W",
              "NW"
            ],
            "validTimePeriod": "all_day",
            "customData": {
              "CH": {
                "subdivision": "minus",
                "coreZoneText": "Danger level \"considerable\" (3-) in west to northeast to southeast facing aspects above 2200m."
              }
            },
            "comment": "Weak layers in the old snowpack necessitate caution. Even single snow sport participants can release avalanches in some places. These can be triggered in deep layers and reach large size in isolated cases. Remotely triggered avalanches are possible in isolated cases. Whumpfing sounds and the formation of shooting cracks when stepping on the snowpack can indicate the danger. <br/> Backcountry touring and other off-piste activities call for extensive experience in the assessment of avalanche danger."
          }
        ],
        "customData": {
          "CH": {
            "aggregation": [
              {
                "category": "dry",
                "validTimePeriod": "all_day",
                "problemTypes": [
                  "persistent_weak_layers"
                ]
              }
            ]
          }
        },
        "weatherForecast": {
          "comment": "<h1>Weather forecast to Tuesday</h1><p>In the north, conditions will range from cloudy with bright intervals to very cloudy, with the brighter intervals primarily occurring in the Visp valleys and Grisons. In the south, conditions will be very cloudy. Some precipitation is expected, especially in the west and south. The snowfall level will be between 1000 and 1500 m.</p>"
        },
        "snowpackStructure": {
          "comment": "<h1>Snowpack</h1><p>Snowpack structure is unfavourable in many locations in southern Valais, Ticino and Grisons, with distinct weak layers that are prone to triggering in the middle and lower part of the snowpack. Whumpfing sounds and avalanches triggered by human activity, often remotely, continue to be reported from these regions. Snowpack structure is somewhat more favourable on the northern flank of the Alps and in northern Valais, but there are weak layers deeper in the snowpack in these re"
        },
        "tendency": [
          {
            "comment": "<h1>Outlook for Wednesday and Thursday</h1><p>On the southern flank of the Alps, both days will see cloudy skies with bright intervals and some precipitation. In the north, conditions will be very cloudy, with repeated precipitation, which will be centred in particular in the west and on the norther"
          }
        ]
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              7.192,
              46.0384
            ],
            [
              7.308,
              45.9164
            ],
            [
              7.3842,
              45.8982
            ],
            [
              7.4459,
              45.9304
            ],
            [
              7.5066,
              45.9612
            ],
            [
              7.5427,
              45.974
            ],
            [
              7.617,
              45.9694
            ],
            [
              7.7082,
              45.9497
            ],
            [
              7.7615,
              45.9371
            ],
            [
              7.8171,
              45.9235
            ],
            [
              7.8772,
              45.9258
            ],
            [
              7.9636,
              45.996
            ],
            [
              8.0228,
              46.0376
            ],
            [
              8.0322,
              46.0881
            ],
            [
              8.1212,
              46.1319
            ],
            [
              8.1597,
              46.1723
            ],
            [
              8.1134,
              46.2381
            ],
            [
              8.058,
              46.2386
            ],
            [
              7.9187,
              46.1564
            ],
            [
              7.7242,
              46.1006
            ],
            [
              7.5053,
              46.0813
            ],
            [
              7.192,
              46.0384
            ]
          ]
        ]
      }
    }
  ]
};

/** Out of season SLF answers 200 with an empty collection. */
export const emptyBulletins = { bulletins: [] };

/** Same, in geojson form. */
export const emptyGeojson = { type: "FeatureCollection", features: [] };

/** /api/bulletin-list/caaml/en/json?limit=1 — newest released bulletin first. */
export const bulletinList = [
  {
    bulletins: [
      {
        bulletinID: "279c357c-4dab-47b9-b0a7-f79ed0fdc5e5",
        lang: "en",
        validTime: { startTime: "2026-05-17T15:00:00Z", endTime: "2026-05-18T15:00:00Z" },
        publicationTime: "2026-05-17T15:00:00Z",
        regions: [{ regionID: "CH-1246", name: "Gadmertal" }],
        dangerRatings: [{ mainValue: "moderate", validTimePeriod: "all_day" }],
      },
    ],
  },
];
