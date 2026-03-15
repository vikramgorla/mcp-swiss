// Mock OpenParlData.ch responses for Swiss Parliament API tests
// Data source: OpenParlData.ch (CC BY 4.0)

export const mockAffairsResponse = {
  meta: {
    offset: 0,
    limit: 5,
    total_records: 96,
    total_pages: 20,
    current_page: 1,
    has_more: true,
  },
  data: [
    {
      id: 296480,
      url_api: "https://api.openparldata.ch/v1/affairs/296480",
      body_key: "CHE",
      external_id: "20267028",
      number: "26.7028",
      title_de: "Unterstützung der Schweiz für die Klimaschutz-Resolution von Vanuatu?",
      title_fr: "La Suisse soutient-elle la résolution du Vanuatu sur le climat ?",
      type_name_de: "Fragestunde. Frage",
      type_harmonized_de: "Fragestunde",
      state_name_de: "Eingereicht",
      begin_date: "2026-03-03T00:00:00",
      end_date: null,
      url_external_de:
        "https://www.parlament.ch/de/ratsbetrieb/suche-curia-vista/geschaeft?AffairId=20267028",
      updated_at: "2026-03-11T03:47:26",
    },
    {
      id: 253572,
      url_api: "https://api.openparldata.ch/v1/affairs/253572",
      body_key: "CHE",
      external_id: "20254001",
      number: "25.4001",
      title_de:
        "Bundesrätliche Massnahmen zur Zielerreichung des Fotovoltaik-Ausbaus nach Energiegesetz",
      title_fr: "Mesures du Conseil fédéral pour l'énergie solaire",
      type_name_de: "Interpellation",
      type_harmonized_de: "Interpellation",
      state_name_de: "Erledigt",
      begin_date: "2025-09-26T00:00:00",
      end_date: "2025-12-01T00:00:00",
      url_external_de:
        "https://www.parlament.ch/de/ratsbetrieb/suche-curia-vista/geschaeft?AffairId=20254001",
      updated_at: "2025-12-15T10:00:00",
    },
  ],
};

export const mockPersonsResponse = {
  meta: {
    offset: 0,
    limit: 10,
    total_records: 253,
    total_pages: 26,
    current_page: 1,
    has_more: true,
  },
  data: [
    {
      id: 18579,
      url_api: "https://api.openparldata.ch/v1/persons/18579",
      body_key: "CHE",
      fullname: "Cyril Aellen",
      firstname: "Cyril",
      lastname: "Aellen",
      party_de: "FDP-Liberale",
      party_harmonized_de: "FDP.Die Liberalen",
      electoral_district_de: "Genf",
      parliament_sector: "NR",
      parliamentary_group_name_de: "Fraktion RL",
      occupation_de: "Advokat/in",
      active: true,
      gender: "m",
      image_url_external:
        "https://www.parlament.ch/sitecollectionimages/profil/original/10803.jpg",
      website_parliament_url_de:
        "https://www.parlament.ch/de/biografie/cyril-aellen/10803",
    },
    {
      id: 18600,
      url_api: "https://api.openparldata.ch/v1/persons/18600",
      body_key: "CHE",
      fullname: "Pierre-Yves Maillard",
      firstname: "Pierre-Yves",
      lastname: "Maillard",
      party_de: "SP",
      party_harmonized_de: "Sozialdemokratische Partei der Schweiz",
      electoral_district_de: "Waadt",
      parliament_sector: "SR",
      parliamentary_group_name_de: "Sozialdemokratische Fraktion",
      occupation_de: "Verbandspräsident",
      active: true,
      gender: "m",
      image_url_external:
        "https://www.parlament.ch/sitecollectionimages/profil/original/491.jpg",
      website_parliament_url_de:
        "https://www.parlament.ch/de/biografie/pierre-yves-maillard/491",
    },
  ],
};

export const mockVotingsResponse = {
  meta: {
    offset: 0,
    limit: 100,
    total_records: 2,
  },
  data: [
    {
      id: 5001,
      affair_id: 296480,
      meaning_yes_de: "Annahme der Motion",
      meaning_no_de: "Ablehnung der Motion",
      total_yes: 102,
      total_no: 88,
      total_abstain: 5,
      total_absent: 5,
      total_excused: 0,
      total_president: 0,
      vote_date: "2026-03-10T14:30:00",
      subject_de: "Gesamtabstimmung",
    },
    {
      id: 5002,
      affair_id: 296480,
      meaning_yes_de: "Eintreten",
      meaning_no_de: "Nichteintreten",
      total_yes: 120,
      total_no: 75,
      total_abstain: 3,
      total_absent: 2,
      total_excused: 0,
      total_president: 0,
      vote_date: "2026-03-10T10:00:00",
      subject_de: "Eintretensdebatte",
    },
  ],
};

export const mockMeetingsResponse = {
  meta: {
    offset: 0,
    limit: 5,
    total_records: 182,
  },
  data: [
    {
      id: 30011,
      url_api: "https://api.openparldata.ch/v1/meetings/30011",
      body_key: "CHE",
      name_de: "Frühjahrssession 2026",
      abbreviation: "FS 26",
      type: "session",
      type_external_de: "Ordentliche Sessionen (je 3 Wochen)",
      begin_date: "2026-03-02T00:00:00",
      end_date: "2026-03-20T00:00:00",
      url_external_de:
        "https://www.parlament.ch/de/ratsbetrieb/sessionen/aktuelle-session",
      state: null,
      group_id: 1665,
    },
    {
      id: 29990,
      url_api: "https://api.openparldata.ch/v1/meetings/29990",
      body_key: "CHE",
      name_de: "Wintersession 2025",
      abbreviation: "WS 25",
      type: "session",
      type_external_de: "Ordentliche Sessionen (je 3 Wochen)",
      begin_date: "2025-12-01T00:00:00",
      end_date: "2025-12-19T00:00:00",
      url_external_de:
        "https://www.parlament.ch/de/ratsbetrieb/sessionen/aktuelle-session",
      state: null,
      group_id: 1664,
    },
  ],
};

export const mockSpeechesResponse = {
  meta: {
    offset: 0,
    limit: 5,
    total_records: 3,
  },
  data: [
    {
      id: 90001,
      person_fullname: "Pierre-Yves Maillard",
      person_id: 18600,
      party_de: "SP",
      text_de:
        "Herr Präsident, geschätzte Kolleginnen und Kollegen. Die vorliegende Motion verdient unsere volle Unterstützung.",
      speech_type_de: "Debattenbeitrag",
      begin_time: "2026-03-10T14:35:00",
      duration_seconds: 180,
    },
    {
      id: 90002,
      person_fullname: "Cyril Aellen",
      person_id: 18579,
      party_de: "FDP-Liberale",
      text_de:
        "Wir lehnen diese Motion ab. Die bestehenden Massnahmen sind ausreichend.",
      speech_type_de: "Debattenbeitrag",
      begin_time: "2026-03-10T14:40:00",
      duration_seconds: 120,
    },
  ],
};

export const mockInterestsResponse = {
  meta: {
    offset: 0,
    limit: 100,
    total_records: 3,
  },
  data: [
    {
      id: 17747,
      body_key: "CHE",
      person_id: 18579,
      name_de: "Kalis Sàrl",
      type_de: "Gesellschaft mit beschränkter Haftung",
      role_name_de: "Gesellschafter(in)",
      type_payment_de: "Bezahlt",
      type_payment_harmonized: "paid",
      group_de: "Keine Angaben",
      begin_date: null,
      end_date: null,
      url: null,
    },
    {
      id: 17746,
      body_key: "CHE",
      person_id: 18579,
      name_de: "AAA Avocats SA",
      type_de: "Aktiengesellschaft",
      role_name_de: "Präsident(in)",
      type_payment_de: "Bezahlt",
      type_payment_harmonized: "paid",
      group_de: "Keine Angaben",
      begin_date: null,
      end_date: null,
      url: null,
    },
  ],
};

export const mockCantonalAffairsResponse = {
  meta: {
    offset: 0,
    limit: 5,
    total_records: 18979,
  },
  data: [
    {
      id: 350001,
      url_api: "https://api.openparldata.ch/v1/affairs/350001",
      body_key: "ZH",
      number: "KR-Nr. 123/2026",
      title_de: "Verkehrsberuhigung in Wohngebieten",
      type_name_de: "Postulat",
      type_harmonized_de: "Postulat",
      state_name_de: "Eingereicht",
      begin_date: "2026-02-15T00:00:00",
      end_date: null,
      url_external_de: "https://www.kantonsrat.zh.ch/geschaefte/123-2026",
    },
  ],
};

export const mockDocsResponse = {
  meta: {
    offset: 0,
    limit: 5,
    total_records: 2,
  },
  data: [
    {
      id: 80001,
      title_de: "Bericht der Kommission für Umwelt, Raumplanung und Energie",
      type_de: "Kommissionsbericht",
      url_external: "https://www.parlament.ch/centers/documents/report.pdf",
      filename: "report.pdf",
      date: "2026-02-28T00:00:00",
    },
    {
      id: 80002,
      title_de: "Stellungnahme des Bundesrates",
      type_de: "Stellungnahme",
      url_external:
        "https://www.parlament.ch/centers/documents/stellungnahme.pdf",
      filename: "stellungnahme.pdf",
      date: "2026-01-15T00:00:00",
    },
  ],
};

export const mockCommitteeMeetingsResponse = {
  meta: {
    offset: 0,
    limit: 5,
    total_records: 3293,
  },
  data: [
    {
      id: 30069,
      url_api: "https://api.openparldata.ch/v1/meetings/30069",
      body_key: "CHE",
      name_de: "Sechste Sitzung",
      abbreviation: null,
      type: "meeting",
      type_external_de: null,
      begin_date: "2026-03-10T08:15:00",
      end_date: null,
      url_external_de: null,
      state: "draft",
      group_id: 1664,
    },
    {
      id: 30070,
      url_api: "https://api.openparldata.ch/v1/meetings/30070",
      body_key: "CHE",
      name_de: "Siebte Sitzung",
      abbreviation: null,
      type: "meeting",
      type_external_de: null,
      begin_date: "2026-03-11T08:15:00",
      end_date: null,
      url_external_de: null,
      state: "draft",
      group_id: 1664,
    },
  ],
};

export const mockEmptyResponse = {
  meta: {
    offset: 0,
    limit: 100,
    total_records: 0,
  },
  data: [],
};
