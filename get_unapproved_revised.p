DEFINE VARIABLE bgyNum AS INTEGER INITIAL 6 NO-UNDO.
DEFINE VARIABLE locNum AS INTEGER INITIAL 22 NO-UNDO.
DEFINE VARIABLE revYear AS INTEGER INITIAL 2024 NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER INITIAL "C:/eGaps/Temp/unapp_test.json" NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.
DEFINE VARIABLE firstItem AS LOGICAL INITIAL YES NO-UNDO.

DEFINE VARIABLE cLand AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE cBldg AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE cMach AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE cTot AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE totArea AS DECIMAL INITIAL 0.0 NO-UNDO.
DEFINE VARIABLE totVal AS DECIMAL INITIAL 0.0 NO-UNDO.
DEFINE VARIABLE pTd AS CHARACTER NO-UNDO.
DEFINE VARIABLE rTd AS CHARACTER NO-UNDO.
DEFINE VARIABLE oName AS CHARACTER NO-UNDO.

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN bgyNum = INTEGER(ENTRY(1, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 2 THEN locNum = INTEGER(ENTRY(2, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 3 THEN revYear = INTEGER(ENTRY(3, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 4 THEN outPath = ENTRY(4, SESSION:PARAMETER).

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "~{" q "status" q ":" q "success" q ",".
PUT UNFORMATTED q "barangayCode" q ":" bgyNum ",".
PUT UNFORMATTED q "localityCode" q ":" locNum ",".
PUT UNFORMATTED q "revisionYear" q ":" revYear ",".
PUT UNFORMATTED q "records" q ":[".

FOR EACH Assessment-Roll USE-INDEX assroll_idx
    WHERE Assessment-Roll.Revision-Year EQ revYear
    AND Assessment-Roll.Locality-Code EQ locNum
    AND Assessment-Roll.Barangay-Code EQ bgyNum
    AND Assessment-Roll.ARP-No GT 0 NO-LOCK:

    IF Assessment-Roll.Kind-Code EQ "L" THEN cLand = cLand + 1.
    ELSE IF Assessment-Roll.Kind-Code EQ "B" THEN cBldg = cBldg + 1.
    ELSE IF Assessment-Roll.Kind-Code EQ "M" THEN cMach = cMach + 1.
    cTot = cTot + 1.
    totArea = totArea + Assessment-Roll.Area.
    totVal = totVal + Assessment-Roll.Assessed-Value.

    IF NOT firstItem THEN PUT UNFORMATTED ",".
    firstItem = NO.

    ASSIGN pTd = STRING(Assessment-Roll.Barangay-Code,"999") + "-" + (IF Assessment-Roll.ARP-No LT 100000 THEN STRING(Assessment-Roll.ARP-No,"99999") ELSE STRING(Assessment-Roll.ARP-No,">>>>>>>9"))
           rTd = (IF Assessment-Roll.System-Revised-ARP-No GT 0 THEN STRING(Assessment-Roll.Revision-Year) + "-" + STRING(Assessment-Roll.Barangay-Code,"999") + "-" + STRING(Assessment-Roll.System-Revised-ARP-No,">>>>>>>9") ELSE "For Approval")
           oName = REPLACE(REPLACE(Assessment-Roll.Owner-Name, "~"", ""), "\", "").

    PUT UNFORMATTED "~{".
    PUT UNFORMATTED q "arpNo" q ":" Assessment-Roll.ARP-No ",".
    PUT UNFORMATTED q "revisedTd" q ":" q rTd q ",".
    PUT UNFORMATTED q "pin" q ":" q Assessment-Roll.Section-No + "-" + Assessment-Roll.Ass-Lot-No + (IF Assessment-Roll.Imp-No NE "" THEN "-" + Assessment-Roll.Imp-No ELSE "") q ",".
    PUT UNFORMATTED q "revisedDate" q ":" q (IF Assessment-Roll.Date-Encoded NE ? THEN STRING(Assessment-Roll.Date-Encoded,"99/99/9999") ELSE "06/15/2026") q ",".
    PUT UNFORMATTED q "propertyType" q ":" q Assessment-Roll.Kind-Code + " - " + Assessment-Roll.Class-Code q ",".
    PUT UNFORMATTED q "kindCode" q ":" q Assessment-Roll.Kind-Code q ",".
    PUT UNFORMATTED q "ownerName" q ":" q oName q ",".
    PUT UNFORMATTED q "marketValue" q ":" Assessment-Roll.Market-Value ",".
    PUT UNFORMATTED q "assessedValue" q ":" Assessment-Roll.Assessed-Value ",".
    PUT UNFORMATTED q "area" q ":" Assessment-Roll.Area ",".
    PUT UNFORMATTED q "prevArea" q ":" (IF Assessment-Roll.Prev-Area GT 0 THEN Assessment-Roll.Prev-Area ELSE Assessment-Roll.Area) ",".
    PUT UNFORMATTED q "prevMarketValue" q ":" Assessment-Roll.Prev-Market-Value ",".
    PUT UNFORMATTED q "prevAssessedValue" q ":" Assessment-Roll.Prev-Assessed-Value ",".
    PUT UNFORMATTED q "prevTdNo" q ":" q pTd q ",".
    PUT UNFORMATTED q "status" q ":" q (IF Assessment-Roll.FAAS-Status EQ 1 THEN "For Approval" ELSE "Approved") q.
    PUT UNFORMATTED "~}".
END.

PUT UNFORMATTED "],".
PUT UNFORMATTED q "summary" q ":~{".
PUT UNFORMATTED q "landCount" q ":" cLand ",".
PUT UNFORMATTED q "bldgCount" q ":" cBldg ",".
PUT UNFORMATTED q "machCount" q ":" cMach ",".
PUT UNFORMATTED q "totalCount" q ":" cTot ",".
PUT UNFORMATTED q "totalArea" q ":" totArea ",".
PUT UNFORMATTED q "totalAssessedValue" q ":" totVal.
PUT UNFORMATTED "~}~}".
OUTPUT CLOSE.
QUIT.