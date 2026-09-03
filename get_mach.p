/* =========================================================================
   GET_MACH.P - Export Machine Records from Progress Database to JSON
   Matching new-mach.p query logic (Kind-Code = "M")
   ========================================================================= */

DEFINE VARIABLE bgyNum AS INTEGER INITIAL 1 NO-UNDO.
DEFINE VARIABLE locNum AS INTEGER INITIAL 22 NO-UNDO.
DEFINE VARIABLE approvedOnly AS LOGICAL INITIAL NO NO-UNDO.
DEFINE VARIABLE revYear AS INTEGER INITIAL 2024 NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN bgyNum = INTEGER(ENTRY(1, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 2 THEN locNum = INTEGER(ENTRY(2, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 3 THEN approvedOnly = (ENTRY(3, SESSION:PARAMETER) EQ "YES" OR ENTRY(3, SESSION:PARAMETER) EQ "TRUE").
IF NUM-ENTRIES(SESSION:PARAMETER) >= 4 THEN outPath = ENTRY(4, SESSION:PARAMETER).
ELSE outPath = "C:/eGaps/Temp/mach_api_out.json".

DEFINE VARIABLE bgyName AS CHARACTER INITIAL "Bugallon Proper" NO-UNDO.
DEFINE VARIABLE locName AS CHARACTER INITIAL "RAMON" NO-UNDO.
DEFINE VARIABLE totalUnits AS DECIMAL INITIAL 0 NO-UNDO.
DEFINE VARIABLE totalAssVal AS DECIMAL INITIAL 0 NO-UNDO.
DEFINE VARIABLE totalRecs AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE firstItem AS LOGICAL INITIAL YES NO-UNDO.

FIND FIRST barangay WHERE barangay.locality-code EQ locNum AND barangay.barangay-code EQ bgyNum NO-LOCK NO-ERROR.
IF AVAILABLE barangay THEN bgyName = barangay.barangay-name.

FIND FIRST locality WHERE locality.locality-code EQ locNum NO-LOCK NO-ERROR.
IF AVAILABLE locality THEN locName = locality.locality-name.

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "~{" q "summary" q ":~{".
PUT UNFORMATTED q "barangayCode" q ":" bgyNum ",".
PUT UNFORMATTED q "barangayName" q ":" q REPLACE(REPLACE(bgyName, "~"", "'"), "\", "/") q ",".
PUT UNFORMATTED q "localityCode" q ":" locNum ",".
PUT UNFORMATTED q "localityName" q ":" q REPLACE(REPLACE(locName, "~"", "'"), "\", "/") q ",".
PUT UNFORMATTED q "revisionYear" q ":" revYear ",".
PUT UNFORMATTED q "fullBarangayTag" q ":" q REPLACE(REPLACE(bgyName + ", " + CAPS(locName), "~"", "'"), "\", "/") q "~},".

PUT UNFORMATTED q "records" q ":[".

IF locNum > 0 AND bgyNum > 0 THEN DO:
    FOR EACH Assessment-Roll USE-INDEX assroll_idx
        WHERE Assessment-Roll.Revision-Year EQ revYear
        AND Assessment-Roll.Locality-Code EQ locNum
        AND Assessment-Roll.Barangay-Code EQ bgyNum
        AND Assessment-Roll.Kind-Code EQ "M"
        AND (NOT approvedOnly OR Assessment-Roll.ARP-No LT 9000000) NO-LOCK:
        
        totalRecs = totalRecs + 1.
        
        FIND FIRST Machine-Dtl WHERE Machine-Dtl.Revision-Year EQ Assessment-Roll.Revision-Year
            AND Machine-Dtl.Locality-Code EQ Assessment-Roll.Locality-Code
            AND Machine-Dtl.Barangay-Code EQ Assessment-Roll.Barangay-Code
            AND Machine-Dtl.ARP-No EQ Assessment-Roll.ARP-No
            AND Machine-Dtl.ARP-Suffix EQ Assessment-Roll.ARP-Suffix NO-LOCK NO-ERROR.

        DEFINE VARIABLE vUnits AS DECIMAL NO-UNDO.
        IF AVAILABLE Machine-Dtl AND Machine-Dtl.No-Unit NE ? THEN 
            vUnits = Machine-Dtl.No-Unit.
        ELSE IF Assessment-Roll.Area NE ? THEN 
            vUnits = Assessment-Roll.Area.
        ELSE 
            vUnits = 1.00.

        DEFINE VARIABLE vAssVal AS DECIMAL NO-UNDO.
        IF Assessment-Roll.Assessed-Value NE ? THEN 
            vAssVal = Assessment-Roll.Assessed-Value.
        ELSE 
            vAssVal = 0.00.

        DEFINE VARIABLE vMktVal AS DECIMAL NO-UNDO.
        IF Assessment-Roll.Market-Value NE ? THEN 
            vMktVal = Assessment-Roll.Market-Value.
        ELSE 
            vMktVal = 0.00.

        IF Assessment-Roll.FAAS-Status EQ 1 AND Assessment-Roll.ARP-No LT 9000000 THEN DO:
            totalUnits = totalUnits + vUnits.
            totalAssVal = totalAssVal + vAssVal.
        END.

        DEFINE VARIABLE vArpFormatted AS CHARACTER NO-UNDO.
        IF Assessment-Roll.ARP-No < 9000000 THEN DO:
            vArpFormatted = STRING(Assessment-Roll.Revision-Year, "9999") + "-" + 
                            STRING(Assessment-Roll.Barangay-Code, "999") + "-" + 
                            STRING(Assessment-Roll.ARP-No, "99999") + 
                            (IF Assessment-Roll.ARP-Suffix NE "" AND Assessment-Roll.ARP-Suffix NE ? THEN "-" + Assessment-Roll.ARP-Suffix ELSE "").
        END.
        ELSE DO:
            vArpFormatted = "For Approval".
        END.

        DEFINE VARIABLE vPinFormatted AS CHARACTER NO-UNDO.
        vPinFormatted = STRING(Assessment-Roll.Revision-Year, "9999") + "-" + 
                        STRING(Assessment-Roll.Barangay-Code, "999") + "-" + 
                        TRIM(Assessment-Roll.Section-No) + "-" + 
                        TRIM(Assessment-Roll.Ass-Lot-No) + 
                        (IF Assessment-Roll.Imp-No NE "" AND Assessment-Roll.Imp-No NE ? THEN "-" + TRIM(Assessment-Roll.Imp-No) ELSE "").

        DEFINE VARIABLE vOwner AS CHARACTER NO-UNDO.
        vOwner = TRIM(Assessment-Roll.Owner-Name).
        IF Assessment-Roll.Administrator NE "" AND Assessment-Roll.Administrator NE ? THEN 
            vOwner = vOwner + " (" + TRIM(Assessment-Roll.Administrator) + ")".
        vOwner = REPLACE(REPLACE(vOwner, "~"", "'"), "\", "/").

        DEFINE VARIABLE vClass AS CHARACTER NO-UNDO.
        IF AVAILABLE Machine-Dtl AND Machine-Dtl.Class-Code NE ? THEN
            vClass = Machine-Dtl.Class-Code.
        ELSE IF Assessment-Roll.Class-Code NE ? THEN
            vClass = Assessment-Roll.Class-Code.
        ELSE
            vClass = "".
        vClass = REPLACE(REPLACE(vClass, "~"", "'"), "\", "/").

        DEFINE VARIABLE vDesc AS CHARACTER NO-UNDO.
        IF AVAILABLE Machine-Dtl AND Machine-Dtl.Machine-Desc NE ? THEN
            vDesc = Machine-Dtl.Machine-Desc.
        ELSE
            vDesc = "".
        vDesc = REPLACE(REPLACE(vDesc, "~"", "'"), "\", "/").

        DEFINE VARIABLE vStatus AS CHARACTER NO-UNDO.
        IF Assessment-Roll.FAAS-Status EQ 2 THEN
            vStatus = "Cancelled".
        ELSE IF Assessment-Roll.ARP-No >= 9000000 THEN
            vStatus = "For Approval".
        ELSE IF Assessment-Roll.For-Correction THEN
            vStatus = "For Correction".
        ELSE
            vStatus = "Approved".

        FIND FIRST Machine-Hdr OF Assessment-Roll NO-LOCK NO-ERROR.
        DEFINE VARIABLE isVal AS LOGICAL NO-UNDO INITIAL NO.
        DEFINE VARIABLE valBy AS CHARACTER NO-UNDO INITIAL "".
        DEFINE VARIABLE valDate AS CHARACTER NO-UNDO INITIAL "".
        DEFINE VARIABLE valTime AS CHARACTER NO-UNDO INITIAL "".

        IF AVAILABLE Machine-Hdr THEN DO:
            isVal = Machine-Hdr.Validated.
            IF isVal THEN DO:
                valBy = REPLACE(REPLACE(Machine-Hdr.Validated-By-Name, "~"", "'"), "\", "/").
                valDate = STRING(Machine-Hdr.Validated-Date, "99/99/9999").
                valTime = STRING(Machine-Hdr.Validated-Time, "HH:MM:SS AM").
            END.
        END.

        IF NOT firstItem THEN PUT UNFORMATTED ",".
        firstItem = NO.

        PUT UNFORMATTED "~{".
        PUT UNFORMATTED q "id" q ":" q "M-" STRING(Assessment-Roll.Barangay-Code) "-" STRING(Assessment-Roll.ARP-No) q ",".
        PUT UNFORMATTED q "arpNo" q ":" q vArpFormatted q ",".
        PUT UNFORMATTED q "rawArp" q ":" Assessment-Roll.ARP-No ",".
        PUT UNFORMATTED q "pin" q ":" q vPinFormatted q ",".
        PUT UNFORMATTED q "sec" q ":" q TRIM(Assessment-Roll.Section-No) q ",".
        PUT UNFORMATTED q "lot" q ":" q TRIM(Assessment-Roll.Ass-Lot-No) q ",".
        PUT UNFORMATTED q "imp" q ":" q TRIM(Assessment-Roll.Imp-No) q ",".
        PUT UNFORMATTED q "ownerName" q ":" q vOwner q ",".
        PUT UNFORMATTED q "administrator" q ":" q (IF Assessment-Roll.Administrator NE ? THEN REPLACE(REPLACE(Assessment-Roll.Administrator, "~"", "'"), "\", "/") ELSE "") q ",".
        PUT UNFORMATTED q "address" q ":" q (IF Assessment-Roll.Property-Location NE ? THEN REPLACE(REPLACE(Assessment-Roll.Property-Location, "~"", "'"), "\", "/") ELSE "") q ",".
        PUT UNFORMATTED q "classCode" q ":" q vClass q ",".
        PUT UNFORMATTED q "machDesc" q ":" q vDesc q ",".
        PUT UNFORMATTED q "noUnits" q ":" vUnits ",".
        PUT UNFORMATTED q "marketValue" q ":" vMktVal ",".
        PUT UNFORMATTED q "assessedValue" q ":" vAssVal ",".
        PUT UNFORMATTED q "status" q ":" q vStatus q ",".
        PUT UNFORMATTED q "validated" q ":" (IF isVal THEN "true" ELSE "false") ",".
        PUT UNFORMATTED q "validatedBy" q ":" q valBy q ",".
        PUT UNFORMATTED q "validatedDate" q ":" q valDate q ",".
        PUT UNFORMATTED q "validatedTime" q ":" q valTime q.
        PUT UNFORMATTED "~}".
    END.
END.

PUT UNFORMATTED "],".
PUT UNFORMATTED q "totals" q ":~{".
PUT UNFORMATTED q "count" q ":" totalRecs ",".
PUT UNFORMATTED q "totalUnits" q ":" totalUnits ",".
PUT UNFORMATTED q "totalAssessedValue" q ":" totalAssVal.
PUT UNFORMATTED "~}".
PUT UNFORMATTED "~}".
OUTPUT CLOSE.
