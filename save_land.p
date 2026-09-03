DEFINE VARIABLE arpNum AS INTEGER NO-UNDO.
DEFINE VARIABLE ownName AS CHARACTER NO-UNDO.
DEFINE VARIABLE lotNum AS CHARACTER NO-UNDO.
DEFINE VARIABLE survNum AS CHARACTER NO-UNDO.
DEFINE VARIABLE octNum AS CHARACTER NO-UNDO.
DEFINE VARIABLE areaVal AS DECIMAL NO-UNDO.
DEFINE VARIABLE mktVal AS DECIMAL NO-UNDO.
DEFINE VARIABLE assVal AS DECIMAL NO-UNDO.
DEFINE VARIABLE locNum AS INTEGER NO-UNDO.
DEFINE VARIABLE bgyNum AS INTEGER NO-UNDO.
DEFINE VARIABLE secNum AS CHARACTER INITIAL "001" NO-UNDO.
DEFINE VARIABLE assLotNum AS CHARACTER INITIAL "001" NO-UNDO.
DEFINE VARIABLE classVal AS CHARACTER INITIAL "R-2" NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

arpNum = INTEGER(ENTRY(1, SESSION:PARAMETER, "|")).
ownName = ENTRY(2, SESSION:PARAMETER, "|").
lotNum = ENTRY(3, SESSION:PARAMETER, "|").
survNum = ENTRY(4, SESSION:PARAMETER, "|").
octNum = ENTRY(5, SESSION:PARAMETER, "|").
areaVal = DECIMAL(ENTRY(6, SESSION:PARAMETER, "|")).
mktVal = DECIMAL(ENTRY(7, SESSION:PARAMETER, "|")).
assVal = DECIMAL(ENTRY(8, SESSION:PARAMETER, "|")).
locNum = INTEGER(ENTRY(9, SESSION:PARAMETER, "|")).
bgyNum = INTEGER(ENTRY(10, SESSION:PARAMETER, "|")).

IF NUM-ENTRIES(SESSION:PARAMETER, "|") >= 12 THEN DO:
    secNum = ENTRY(11, SESSION:PARAMETER, "|").
    assLotNum = ENTRY(12, SESSION:PARAMETER, "|").
END.
IF NUM-ENTRIES(SESSION:PARAMETER, "|") >= 13 THEN DO:
    classVal = ENTRY(13, SESSION:PARAMETER, "|").
END.
IF NUM-ENTRIES(SESSION:PARAMETER, "|") >= 14 THEN DO:
    outPath = ENTRY(14, SESSION:PARAMETER, "|").
END.
ELSE DO:
    outPath = "C:/eGaps/Temp/save_land_out.json".
END.

/* 1. Update/Create in Assessment-Roll (Revision 2024) */
FIND FIRST Assessment-Roll WHERE Assessment-Roll.Revision-Year EQ 2024
    AND Assessment-Roll.Locality-Code EQ locNum
    AND Assessment-Roll.Barangay-Code EQ bgyNum
    AND Assessment-Roll.ARP-No EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF NOT AVAILABLE Assessment-Roll THEN DO:
    CREATE Assessment-Roll.
    Assessment-Roll.Revision-Year = 2024.
    Assessment-Roll.Locality-Code = locNum.
    Assessment-Roll.Barangay-Code = bgyNum.
    Assessment-Roll.ARP-No = arpNum.
    Assessment-Roll.Kind-Code = "L".
END.

Assessment-Roll.Owner-Name = ownName.
Assessment-Roll.Cad-Lot-No = lotNum.
Assessment-Roll.Survey-No = survNum.
Assessment-Roll.OCT-TCT-No = octNum.
Assessment-Roll.Area = areaVal.
Assessment-Roll.Market-Value = mktVal.
Assessment-Roll.Assessed-Value = assVal.
Assessment-Roll.Section-No = secNum.
Assessment-Roll.Ass-Lot-No = assLotNum.
Assessment-Roll.Actual-Use-Code = classVal.
Assessment-Roll.Class-Code = classVal.
Assessment-Roll.Taxable = "Taxable".

/* 2. Update/Create in Land-Dtl (Revision 2024) */
FIND FIRST Land-Dtl WHERE Land-Dtl.Revision-Year EQ 2024
    AND Land-Dtl.Locality-Code EQ locNum
    AND Land-Dtl.Barangay-Code EQ bgyNum
    AND Land-Dtl.ARP-No EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF NOT AVAILABLE Land-Dtl THEN DO:
    CREATE Land-Dtl.
    Land-Dtl.Revision-Year = 2024.
    Land-Dtl.Locality-Code = locNum.
    Land-Dtl.Barangay-Code = bgyNum.
    Land-Dtl.ARP-No = arpNum.
    Land-Dtl.Dtl-Type = 1.
END.

Land-Dtl.Area = areaVal.
Land-Dtl.Actual-Use-Desc = classVal.
Land-Dtl.SubClass-Desc = classVal.
Land-Dtl.Unit-Value = (IF areaVal > 0 AND mktVal > 0 THEN ROUND(mktVal / areaVal, 2) ELSE 0.00).

/* 3. Also update legacy land-hdr if existing for same composite key */
FIND FIRST land-hdr WHERE land-hdr.revision-year EQ 2024
    AND land-hdr.locality-code EQ locNum
    AND land-hdr.barangay-code EQ bgyNum
    AND land-hdr.arp-no EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF AVAILABLE land-hdr THEN DO:
    land-hdr.owner-name = ownName.
    land-hdr.tot-area = areaVal.
    land-hdr.market-value = mktVal.
    land-hdr.assessed-value = assVal.
END.

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "~{" q "status" q ":" q "success" q ",".
PUT UNFORMATTED q "arpNo" q ":" arpNum ",".
PUT UNFORMATTED q "ownerName" q ":" q ownName q ",".
PUT UNFORMATTED q "message" q ":" q "Saved successfully to OpenEdge rpadb database (Assessment-Roll and Land-Dtl)" q "~}".
OUTPUT CLOSE.
QUIT.