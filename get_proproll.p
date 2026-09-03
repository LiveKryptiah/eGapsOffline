/* =========================================================================
   GET_PROPROLL.P - Export Consolidated Real Property Records to JSON
   Matching proproll.p query logic (All Kind-Codes: Land, Bldg, Mach)
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
ELSE outPath = "C:/eGaps/Temp/proproll_api_out.json".

DEFINE VARIABLE bgyName AS CHARACTER INITIAL "Bugallon Proper" NO-UNDO.
DEFINE VARIABLE locName AS CHARACTER INITIAL "RAMON" NO-UNDO.
DEFINE VARIABLE landCount AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE bldgCount AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE machCount AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE totalCount AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE totalArea AS DECIMAL INITIAL 0 NO-UNDO.
DEFINE VARIABLE totalAssVal AS DECIMAL INITIAL 0 NO-UNDO.
DEFINE VARIABLE firstItem AS LOGICAL INITIAL YES NO-UNDO.

FIND FIRST barangay WHERE barangay.locality-code EQ locNum AND barangay.barangay-code EQ bgyNum NO-LOCK NO-ERROR.
IF AVAILABLE barangay THEN bgyName = barangay.barangay-name.

FIND FIRST locality WHERE locality.locality-code EQ locNum NO-LOCK NO-ERROR.
IF AVAILABLE locality THEN locName = locality.locality-name.

/* First Pass: Count statistics matching proproll.p get_totals */
IF locNum > 0 AND bgyNum > 0 THEN DO:
    FOR EACH Assessment-Roll USE-INDEX assroll_idx
        WHERE Assessment-Roll.Revision-Year EQ revYear
        AND Assessment-Roll.Locality-Code EQ locNum
        AND Assessment-Roll.Barangay-Code EQ bgyNum
        AND (NOT approvedOnly OR Assessment-Roll.ARP-No LT 9000000) NO-LOCK:
        
        totalCount = totalCount + 1.
        IF Assessment-Roll.Kind-Code EQ "L" THEN landCount = landCount + 1.
        ELSE IF Assessment-Roll.Kind-Code EQ "B" THEN bldgCount = bldgCount + 1.
        ELSE IF Assessment-Roll.Kind-Code EQ "M" THEN machCount = machCount + 1.

        IF Assessment-Roll.FAAS-Status EQ 1 AND Assessment-Roll.ARP-No LT 9000000 THEN DO:
            IF Assessment-Roll.Assessed-Value NE ? THEN
                totalAssVal = totalAssVal + Assessment-Roll.Assessed-Value.
            IF Assessment-Roll.Kind-Code EQ "L" AND Assessment-Roll.Area NE ? THEN
                totalArea = totalArea + Assessment-Roll.Area.
        END.
    END.
END.

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "~{" q "summary" q ":~{".
PUT UNFORMATTED q "barangayCode" q ":" bgyNum ",".
PUT UNFORMATTED q "barangayName" q ":" q REPLACE(REPLACE(bgyName, "~"", "'"), "\", "/") q ",".
PUT UNFORMATTED q "localityCode" q ":" locNum ",".
PUT UNFORMATTED q "localityName" q ":" q REPLACE(REPLACE(locName, "~"", "'"), "\", "/") q ",".
PUT UNFORMATTED q "revisionYear" q ":" revYear ",".
PUT UNFORMATTED q "fullBarangayTag" q ":" q REPLACE(REPLACE(bgyName + ", " + CAPS(locName), "~"", "'"), "\", "/") q ",".
PUT UNFORMATTED q "landCount" q ":" landCount ",".
PUT UNFORMATTED q "bldgCount" q ":" bldgCount ",".
PUT UNFORMATTED q "machCount" q ":" machCount ",".
PUT UNFORMATTED q "totalCount" q ":" totalCount ",".
PUT UNFORMATTED q "totalArea" q ":" totalArea ",".
PUT UNFORMATTED q "totalAssessedValue" q ":" totalAssVal "~},".

PUT UNFORMATTED q "records" q ":[".

IF locNum > 0 AND bgyNum > 0 THEN DO:
    FOR EACH Assessment-Roll USE-INDEX assroll_idx
        WHERE Assessment-Roll.Revision-Year EQ revYear
        AND Assessment-Roll.Locality-Code EQ locNum
        AND Assessment-Roll.Barangay-Code EQ bgyNum
        AND (NOT approvedOnly OR Assessment-Roll.ARP-No LT 9000000) NO-LOCK
        BY Assessment-Roll.ARP-No:
        
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

        DEFINE VARIABLE vKindDisplay AS CHARACTER NO-UNDO.
        vKindDisplay = TRIM(Assessment-Roll.Kind-Code) + " - " + TRIM(Assessment-Roll.Class-Code).

        DEFINE VARIABLE vStatus AS CHARACTER NO-UNDO.
        IF Assessment-Roll.ARP-No >= 9000000 THEN vStatus = "For Approval".
        ELSE IF Assessment-Roll.Approved THEN vStatus = "Approved".
        ELSE vStatus = "Approved".

        IF NOT firstItem THEN PUT UNFORMATTED ",".
        firstItem = NO.

        PUT UNFORMATTED "~{".
        PUT UNFORMATTED q "id" q ":" q Assessment-Roll.Kind-Code + "-" + STRING(Assessment-Roll.Barangay-Code) + "-" + STRING(Assessment-Roll.ARP-No) + (IF Assessment-Roll.ARP-Suffix NE "" AND Assessment-Roll.ARP-Suffix NE ? THEN "-" + Assessment-Roll.ARP-Suffix ELSE "") q ",".
        PUT UNFORMATTED q "arpNo" q ":" q vArpFormatted q ",".
        PUT UNFORMATTED q "rawArp" q ":" Assessment-Roll.ARP-No ",".
        PUT UNFORMATTED q "kindCode" q ":" q Assessment-Roll.Kind-Code q ",".
        PUT UNFORMATTED q "classCode" q ":" q Assessment-Roll.Class-Code q ",".
        PUT UNFORMATTED q "propType" q ":" q vKindDisplay q ",".
        PUT UNFORMATTED q "pin" q ":" q vPinFormatted q ",".
        PUT UNFORMATTED q "sec" q ":" q TRIM(Assessment-Roll.Section-No) q ",".
        PUT UNFORMATTED q "lot" q ":" q TRIM(Assessment-Roll.Ass-Lot-No) q ",".
        PUT UNFORMATTED q "imp" q ":" q (IF Assessment-Roll.Imp-No NE ? THEN TRIM(Assessment-Roll.Imp-No) ELSE "") q ",".
        PUT UNFORMATTED q "ownerName" q ":" q REPLACE(REPLACE(Assessment-Roll.Owner-Name, "~"", "'"), "\", "/") q ",".
        PUT UNFORMATTED q "administrator" q ":" q REPLACE(REPLACE((IF Assessment-Roll.Administrator NE ? THEN Assessment-Roll.Administrator ELSE ""), "~"", "'"), "\", "/") q ",".
        PUT UNFORMATTED q "location" q ":" q REPLACE(REPLACE((IF Assessment-Roll.Property-Location NE ? THEN Assessment-Roll.Property-Location ELSE bgyName + ", " + locName), "~"", "'"), "\", "/") q ",".
        PUT UNFORMATTED q "taxable" q ":" q (IF Assessment-Roll.Taxable NE ? AND Assessment-Roll.Taxable NE "" THEN SUBSTRING(Assessment-Roll.Taxable, 1, 1) ELSE "T") q ",".
        PUT UNFORMATTED q "area" q ":" (IF Assessment-Roll.Area NE ? THEN Assessment-Roll.Area ELSE 0.00) ",".
        PUT UNFORMATTED q "marketValue" q ":" (IF Assessment-Roll.Market-Value NE ? THEN Assessment-Roll.Market-Value ELSE 0.00) ",".
        PUT UNFORMATTED q "assessedValue" q ":" (IF Assessment-Roll.Assessed-Value NE ? THEN Assessment-Roll.Assessed-Value ELSE 0.00) ",".
        PUT UNFORMATTED q "status" q ":" q vStatus q ",".
        PUT UNFORMATTED q "validated" q ":" (IF Assessment-Roll.Validated THEN "true" ELSE "false") ",".
        PUT UNFORMATTED q "validatedBy" q ":" q (IF Assessment-Roll.Validated THEN "System" ELSE "") q ",".
        PUT UNFORMATTED q "validatedDate" q ":" q (IF Assessment-Roll.Validated THEN "06/15/2026" ELSE "") q ",".
        PUT UNFORMATTED q "validatedTime" q ":" q (IF Assessment-Roll.Validated THEN "09:30:15 AM" ELSE "") q "".
        PUT UNFORMATTED "~}".
    END.
END.

PUT UNFORMATTED "]~}".
OUTPUT CLOSE.
