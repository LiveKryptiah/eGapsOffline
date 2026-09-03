/* ==========================================================================
   eRPAS Modern Data Store - Authentic Province of Isabela Mock Records
   ========================================================================== */

window.eRPAS_DATA = {
  provinceInfo: {
    provinceName: "Province of Isabela",
    provincialAssessor: "Guillermo B. Barretto",
    asstAssessor: "Concepcion B. Pascua",
    provincialTreasurer: "Maria Teresa A. Flores",
    revisionYear: 2026,
    activeCycle: "General Revision Cycle 4",
    totalRPUs: 142850,
    totalAssessedValue: 48752400000
  },

  municipalities: [
    { code: "01", name: "City of Ilagan (Capital)", rpuCount: 38420 },
    { code: "02", name: "Cauayan City", rpuCount: 32150 },
    { code: "03", name: "Santiago City", rpuCount: 29800 },
    { code: "04", name: "Roxas", rpuCount: 12450 },
    { code: "05", name: "Cabagan", rpuCount: 11200 },
    { code: "06", name: "Jones", rpuCount: 8940 },
    { code: "07", name: "Tumauini", rpuCount: 9840 }
  ],

  barangays: [
    "Alibagu", "San Vicente", "Centro Poblacion", "Minante 1", "Minante 2",
    "Bagumbayan", "San Fermin", "Rizal", "Tagaran", "Calamagui 1st",
    "Marana 1st", "Guibang", "District 1", "District 2", "San Fabian"
  ],

  landUnits: [
    {
      id: "L-2026-001",
      arpNo: "2026-01-004-01294",
      pin: "024-01-004-05-012",
      ownerName: "MENDOZA, ROBERTO S. & CARMEN T.",
      administrator: "Same as Owner",
      address: "Brgy. Alibagu, City of Ilagan, Isabela",
      barangay: "Alibagu",
      municipality: "City of Ilagan (Capital)",
      lotNo: "Lot 4182-B-2",
      surveyNo: "Psd-02-048912",
      octTctNo: "T-384910",
      classification: "Residential",
      subClass: "Residential Regular (R-1)",
      area: 450.00,
      areaUnit: "sq.m.",
      unitValue: 3500.00,
      baseMarketValue: 1575000.00,
      adjustmentFactor: 1.00,
      adjustedMarketValue: 1575000.00,
      assessmentLevel: 20, // 20%
      assessedValue: 315000.00,
      taxability: "Taxable",
      effectivityYear: 2026,
      status: "Active"
    },
    {
      id: "L-2026-002",
      arpNo: "2026-01-008-03481",
      pin: "024-01-008-02-045",
      ownerName: "ISABELA AGRO-INDUSTRIAL DEV. CORP.",
      administrator: "Atty. Renato P. Dimaliwat",
      address: "National Highway, San Fermin, Cauayan City, Isabela",
      barangay: "San Fermin",
      municipality: "Cauayan City",
      lotNo: "Lot 12-A",
      surveyNo: "Pcs-02-009124",
      octTctNo: "T-291480",
      classification: "Commercial",
      subClass: "Commercial Prime (C-1)",
      area: 1250.00,
      areaUnit: "sq.m.",
      unitValue: 8500.00,
      baseMarketValue: 10625000.00,
      adjustmentFactor: 1.05, // corner lot +5%
      adjustedMarketValue: 11156250.00,
      assessmentLevel: 50, // 50%
      assessedValue: 5578125.00,
      taxability: "Taxable",
      effectivityYear: 2026,
      status: "Active"
    },
    {
      id: "L-2026-003",
      arpNo: "2026-04-002-00812",
      pin: "024-04-002-01-089",
      ownerName: "VALDEZ, DOMINADOR M.",
      administrator: "Elena G. Valdez",
      address: "Brgy. Rizal, Roxas, Isabela",
      barangay: "Rizal",
      municipality: "Roxas",
      lotNo: "Lot 804",
      surveyNo: "Cad-305-D",
      octTctNo: "OCT-P-14920",
      classification: "Agricultural",
      subClass: "Riceland Irrigated (A-1)",
      area: 25000.00, // 2.5 has.
      areaUnit: "sq.m.",
      unitValue: 120.00,
      baseMarketValue: 3000000.00,
      adjustmentFactor: 0.95, // distance to road -5%
      adjustedMarketValue: 2850000.00,
      assessmentLevel: 40, // 40%
      assessedValue: 1140000.00,
      taxability: "Taxable",
      effectivityYear: 2026,
      status: "Active"
    },
    {
      id: "L-2026-004",
      arpNo: "2026-05-001-00214",
      pin: "024-05-001-03-014",
      ownerName: "PROVINCIAL GOVERNMENT OF ISABELA",
      administrator: "Provincial General Services Officer",
      address: "Capitol Compound, Alibagu, City of Ilagan",
      barangay: "Alibagu",
      municipality: "City of Ilagan (Capital)",
      lotNo: "Lot 1",
      surveyNo: "Swo-02-000142",
      octTctNo: "T-50112",
      classification: "Government / Exempt",
      subClass: "Special Public Land",
      area: 48000.00,
      areaUnit: "sq.m.",
      unitValue: 4000.00,
      baseMarketValue: 192000000.00,
      adjustmentFactor: 1.00,
      adjustedMarketValue: 192000000.00,
      assessmentLevel: 0,
      assessedValue: 0.00,
      taxability: "Exempt",
      effectivityYear: 2026,
      status: "Active"
    }
  ],

  buildingUnits: [
    {
      id: "B-2026-001",
      arpNo: "2026-01-004-01295",
      pin: "024-01-004-05-012-B001",
      ownerName: "MENDOZA, ROBERTO S. & CARMEN T.",
      address: "Brgy. Alibagu, City of Ilagan, Isabela",
      barangay: "Alibagu",
      buildingKind: "Two-Storey Residential House",
      structuralType: "Type III-A (Reinforced Concrete & Steel)",
      floorArea: 280.00,
      yearConstructed: 2018,
      unitValue: 14500.00,
      replacementCostNew: 4060000.00,
      depreciationRate: 12, // 12%
      depreciatedMarketValue: 3572800.00,
      assessmentLevel: 30, // 30%
      assessedValue: 1071840.00,
      status: "Active"
    },
    {
      id: "B-2026-002",
      arpNo: "2026-01-008-03482",
      pin: "024-01-008-02-045-B001",
      ownerName: "ISABELA AGRO-INDUSTRIAL DEV. CORP.",
      address: "San Fermin, Cauayan City, Isabela",
      barangay: "San Fermin",
      buildingKind: "Commercial Warehouse & Silo",
      structuralType: "Type IV (Structural Steel Frame)",
      floorArea: 1850.00,
      yearConstructed: 2021,
      unitValue: 11000.00,
      replacementCostNew: 20350000.00,
      depreciationRate: 8,
      depreciatedMarketValue: 18722000.00,
      assessmentLevel: 50,
      assessedValue: 9361000.00,
      status: "Active"
    }
  ],

  machineUnits: [
    {
      id: "M-2026-001",
      arpNo: "2026-01-008-03483",
      pin: "024-01-008-02-045-M001",
      ownerName: "ISABELA AGRO-INDUSTRIAL DEV. CORP.",
      address: "San Fermin, Cauayan City, Isabela",
      machineryDesc: "Grain Drying & Mechanical Milling Complex (50 TPD)",
      acquisitionYear: 2022,
      originalCost: 15400000.00,
      depreciationRate: 20,
      marketValue: 12320000.00,
      assessmentLevel: 80, // 80% for commercial machinery
      assessedValue: 9856000.00,
      status: "Active"
    }
  ],

  approvalQueue: [
    {
      transactionId: "TX-2026-0819-001",
      arpNo: "2026-01-004-01300",
      pin: "024-01-004-05-029",
      ownerName: "SANTOS, FERDINAND Q.",
      transactionType: "Subdivision of Land Parcel",
      propertyType: "Land",
      barangay: "Alibagu, Ilagan",
      marketValue: 2450000.00,
      assessedValue: 490000.00,
      appraiser: "Editha Q Medrano",
      dateSubmitted: "19 Aug 2026 09:15 AM",
      status: "Pending Assessor Review"
    },
    {
      transactionId: "TX-2026-0819-002",
      arpNo: "2026-02-003-04192",
      pin: "024-02-003-01-018",
      ownerName: "PASCUAL REALTY & HOLDINGS INC.",
      transactionType: "Building Reassessment (New Construction)",
      propertyType: "Building",
      barangay: "Centro Poblacion, Cauayan",
      marketValue: 8200000.00,
      assessedValue: 2460000.00,
      appraiser: "Mark Gen S. Siquian",
      dateSubmitted: "19 Aug 2026 10:00 AM",
      status: "Pending Assessor Review"
    },
    {
      transactionId: "TX-2026-0818-019",
      arpNo: "2026-04-001-00941",
      pin: "024-04-001-02-054",
      ownerName: "DE LA CRUZ, ARTHUR B.",
      transactionType: "Simple Transfer of Ownership",
      propertyType: "Land",
      barangay: "Rizal, Roxas",
      marketValue: 1850000.00,
      assessedValue: 370000.00,
      appraiser: "Editha Q Medrano",
      dateSubmitted: "18 Aug 2026 04:30 PM",
      status: "Approved"
    }
  ]
};
