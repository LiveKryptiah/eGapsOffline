DEFINE VARIABLE inJsonPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE outJsonPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

/* Parameters passed via pipe delimited string */
DEFINE VARIABLE arpNum AS INTEGER NO-UNDO.
DEFINE VARIABLE locNum AS INTEGER NO-UNDO.
DEFINE VARIABLE bgyNum AS INTEGER NO-UNDO.
DEFINE VARIABLE revYear AS INTEGER INITIAL 2024 NO-UNDO.
DEFINE VARIABLE ownName AS CHARACTER NO-UNDO.
DEFINE VARIABLE ownAddr AS CHARACTER NO-UNDO.
DEFINE VARIABLE admName AS CHARACTER NO-UNDO.
DEFINE VARIABLE admAddr AS CHARACTER NO-UNDO.
DEFINE VARIABLE octNum AS CHARACTER NO-UNDO.
DEFINE VARIABLE survNum AS CHARACTER NO-UNDO.
DEFINE VARIABLE cadLot AS CHARACTER NO-UNDO.
DEFINE VARIABLE secNum AS CHARACTER NO-UNDO.
DEFINE VARIABLE assLot AS CHARACTER NO-UNDO.
DEFINE VARIABLE bNorth AS CHARACTER NO-UNDO.
DEFINE VARIABLE bEast AS CHARACTER NO-UNDO.
DEFINE VARIABLE bSouth AS CHARACTER NO-UNDO.
DEFINE VARIABLE bWest AS CHARACTER NO-UNDO.
DEFINE VARIABLE areaVal AS DECIMAL NO-UNDO.
DEFINE VARIABLE unitVal AS DECIMAL NO-UNDO.
DEFINE VARIABLE mktVal AS DECIMAL NO-UNDO.
DEFINE VARIABLE assVal AS DECIMAL NO-UNDO.
DEFINE VARIABLE classVal AS CHARACTER NO-UNDO.
DEFINE VARIABLE taxVal AS CHARACTER NO-UNDO.
DEFINE VARIABLE effYear AS INTEGER NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.

arpNum = INTEGER(ENTRY(1, SESSION:PARAMETER, "|")).
locNum = INTEGER(ENTRY(2, SESSION:PARAMETER, "|")).
bgyNum = INTEGER(ENTRY(3, SESSION:PARAMETER, "|")).
ownName = ENTRY(4, SESSION:PARAMETER, "|").
ownAddr = ENTRY(5, SESSION:PARAMETER, "|").
admName = ENTRY(6, SESSION:PARAMETER, "|").
admAddr = ENTRY(7, SESSION:PARAMETER, "|").
octNum = ENTRY(8, SESSION:PARAMETER, "|").
survNum = ENTRY(9, SESSION:PARAMETER, "|").
cadLot = ENTRY(10, SESSION:PARAMETER, "|").
secNum = ENTRY(11, SESSION:PARAMETER, "|").
assLot = ENTRY(12, SESSION:PARAMETER, "|").
bNorth = ENTRY(13, SESSION:PARAMETER, "|").
bEast = ENTRY(14, SESSION:PARAMETER, "|").
bSouth = ENTRY(15, SESSION:PARAMETER, "|").
bWest = ENTRY(16, SESSION:PARAMETER, "|").
areaVal = DECIMAL(ENTRY(17, SESSION:PARAMETER, "|")).
unitVal = DECIMAL(ENTRY(18, SESSION:PARAMETER, "|")).
mktVal = DECIMAL(ENTRY(19, SESSION:PARAMETER, "|")).
assVal = DECIMAL(ENTRY(20, SESSION:PARAMETER, "|")).
classVal = ENTRY(21, SESSION:PARAMETER, "|").
taxVal = ENTRY(22, SESSION:PARAMETER, "|").
effYear = INTEGER(ENTRY(23, SESSION:PARAMETER, "|")).
outPath = ENTRY(24, SESSION:PARAMETER, "|").

/* 1. Update/Create Assessment-Roll */
FIND FIRST Assessment-Roll WHERE Assessment-Roll.Revision-Year EQ revYear
    AND Assessment-Roll.Locality-Code EQ locNum
    AND Assessment-Roll.Barangay-Code EQ bgyNum
    AND Assessment-Roll.ARP-No EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF NOT AVAILABLE Assessment-Roll THEN DO:
    CREATE Assessment-Roll.
    Assessment-Roll.Revision-Year = revYear.
    Assessment-Roll.Locality-Code = locNum.
    Assessment-Roll.Barangay-Code = bgyNum.
    Assessment-Roll.ARP-No = arpNum.
    Assessment-Roll.Kind-Code = "L".
END.

Assessment-Roll.Owner-Name = ownName.
Assessment-Roll.Administrator = admName.
Assessment-Roll.OCT-TCT-No = octNum.
Assessment-Roll.Survey-No = survNum.
Assessment-Roll.Cad-Lot-No = cadLot.
Assessment-Roll.Section-No = secNum.
Assessment-Roll.Ass-Lot-No = assLot.
Assessment-Roll.Area = areaVal.
Assessment-Roll.Market-Value = mktVal.
Assessment-Roll.Assessed-Value = assVal.
Assessment-Roll.Class-Code = classVal.
Assessment-Roll.Actual-Use-Code = classVal.
Assessment-Roll.Taxable = (IF taxVal EQ "Exempt" OR taxVal EQ "E" THEN "Exempted" ELSE "Taxable").

/* 2. Update/Create Land-Dtl */
FIND FIRST Land-Dtl WHERE Land-Dtl.Revision-Year EQ revYear
    AND Land-Dtl.Locality-Code EQ locNum
    AND Land-Dtl.Barangay-Code EQ bgyNum
    AND Land-Dtl.ARP-No EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF NOT AVAILABLE Land-Dtl THEN DO:
    CREATE Land-Dtl.
    Land-Dtl.Revision-Year = revYear.
    Land-Dtl.Locality-Code = locNum.
    Land-Dtl.Barangay-Code = bgyNum.
    Land-Dtl.ARP-No = arpNum.
    Land-Dtl.Dtl-Type = 1.
END.

Land-Dtl.Area = areaVal.
Land-Dtl.Unit-Value = unitVal.
Land-Dtl.Base-Market-Value = mktVal.
Land-Dtl.Market-Value = mktVal.
Land-Dtl.Class-Desc = "Residential".
Land-Dtl.SubClass-Desc = classVal.
Land-Dtl.Actual-Use-Desc = classVal.
Land-Dtl.PT-Exempt = (taxVal EQ "Exempt" OR taxVal EQ "E").

/* 3. Update/Create land-hdr for Boundaries & Addresses */
FIND FIRST land-hdr WHERE land-hdr.locality-code EQ locNum
    AND land-hdr.barangay-code EQ bgyNum
    AND land-hdr.arp-no EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF NOT AVAILABLE land-hdr THEN DO:
    CREATE land-hdr.
    land-hdr.locality-code = locNum.
    land-hdr.barangay-code = bgyNum.
    land-hdr.arp-no = arpNum.
    land-hdr.revision-year = revYear.
END.

land-hdr.Owner-Name = ownName.
land-hdr.TD-Owner-Address = ownAddr.
land-hdr.Admin-Address = admAddr.
land-hdr.North = bNorth.
land-hdr.East = bEast.
land-hdr.South = bSouth.
land-hdr.West = bWest.
land-hdr.OCT-TCT-No = octNum.
land-hdr.Survey-No = survNum.
land-hdr.Cad-Lot-No = cadLot.
land-hdr.tot-area = areaVal.
land-hdr.market-value = mktVal.
land-hdr.assessed-value = assVal.
land-hdr.Effect-Year = effYear.

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "~{" q "status" q ":" q "success" q ",".
PUT UNFORMATTED q "arpNo" q ":" arpNum ",".
PUT UNFORMATTED q "message" q ":" q "Property FAAS & Assessment Roll updated successfully in Progress rpadb database" q "~}".
OUTPUT CLOSE.
QUIT.