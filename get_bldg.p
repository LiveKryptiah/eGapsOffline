DEFINE VARIABLE bgyNum AS INTEGER INITIAL 6 NO-UNDO.
DEFINE VARIABLE locNum AS INTEGER INITIAL 22 NO-UNDO.
DEFINE VARIABLE approvedOnly AS LOGICAL INITIAL NO NO-UNDO.
DEFINE VARIABLE revYear AS INTEGER INITIAL 2024 NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN bgyNum = INTEGER(ENTRY(1, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 2 THEN locNum = INTEGER(ENTRY(2, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 3 THEN approvedOnly = (ENTRY(3, SESSION:PARAMETER) EQ "YES" OR ENTRY(3, SESSION:PARAMETER) EQ "TRUE").
IF NUM-ENTRIES(SESSION:PARAMETER) >= 4 THEN outPath = ENTRY(4, SESSION:PARAMETER).
ELSE outPath = "C:/eGaps/Temp/bldg_api_out.json".

DEFINE VARIABLE bgyName AS CHARACTER INITIAL "San Antonio" NO-UNDO.
DEFINE VARIABLE locName AS CHARACTER INITIAL "RAMON" NO-UNDO.
DEFINE VARIABLE totalArea AS DECIMAL INITIAL 0 NO-UNDO.
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
        AND Assessment-Roll.Kind-Code EQ "B"
        AND (NOT approvedOnly OR Assessment-Roll.ARP-No LT 9000000) NO-LOCK:
        
        totalRecs = totalRecs + 1.
        
        FIND FIRST Bldg-Dtl WHERE Bldg-Dtl.Revision-Year EQ Assessment-Roll.Revision-Year
            AND Bldg-Dtl.Locality-Code EQ Assessment-Roll.Locality-Code
            AND Bldg-Dtl.Barangay-Code EQ Assessment-Roll.Barangay-Code
            AND Bldg-Dtl.ARP-No EQ Assessment-Roll.ARP-No
            AND Bldg-Dtl.ARP-Suffix EQ Assessment-Roll.ARP-Suffix NO-LOCK NO-ERROR.

        DEFINE VARIABLE vArea AS DECIMAL NO-UNDO.
        IF AVAILABLE Bldg-Dtl AND Bldg-Dtl.Flr-Area NE ? THEN 
            vArea = Bldg-Dtl.Flr-Area.
        ELSE IF Assessment-Roll.Area NE ? THEN 
            vArea = Assessment-Roll.Area.
        ELSE 
            vArea = 0.00.
            
        DEFINE VARIABLE vUnit AS DECIMAL NO-UNDO.
        IF AVAILABLE Bldg-Dtl AND Bldg-Dtl.Unit-Value NE ? THEN vUnit = Bldg-Dtl.Unit-Value.
        ELSE IF Assessment-Roll.Area > 0 AND Assessment-Roll.Market-Value > 0 THEN 
            vUnit = ROUND(Assessment-Roll.Market-Value / Assessment-Roll.Area, 2).
        ELSE vUnit = 0.00.
        
        DEFINE VARIABLE vClass AS CHARACTER NO-UNDO.
        IF AVAILABLE Bldg-Dtl AND Bldg-Dtl.Class-Code NE ? THEN 
            vClass = Bldg-Dtl.Class-Code + (IF Bldg-Dtl.SType-Code NE "" THEN " (" + Bldg-Dtl.SType-Code + ")" ELSE "").
        ELSE IF Assessment-Roll.Class-Code NE "" THEN vClass = Assessment-Roll.Class-Code.
        ELSE vClass = "R-2".
        
        DEFINE VARIABLE vUse AS CHARACTER NO-UNDO.
        IF AVAILABLE Bldg-Dtl AND Bldg-Dtl.Actual-Use-Desc NE ? AND Bldg-Dtl.Actual-Use-Desc NE "" THEN
            vUse = Bldg-Dtl.Actual-Use-Desc.
        ELSE vUse = "Residential Building".
        
        DEFINE VARIABLE vAdjust AS CHARACTER NO-UNDO.
        IF AVAILABLE Bldg-Dtl AND Bldg-Dtl.Depreciation-Rate NE ? AND Bldg-Dtl.Depreciation-Rate > 0 THEN 
            vAdjust = "Depr. " + STRING(Bldg-Dtl.Depreciation-Rate, ">>9.9") + "%".
        ELSE vAdjust = "None".
        
        DEFINE VARIABLE vTax AS CHARACTER NO-UNDO.
        IF AVAILABLE Bldg-Dtl AND Bldg-Dtl.Exempted EQ YES THEN
            vTax = "E".
        ELSE IF Assessment-Roll.Taxable EQ "Exempted" OR Assessment-Roll.Taxable EQ "E" THEN
            vTax = "E".
        ELSE
            vTax = "T".
            
        DEFINE VARIABLE vMV AS DECIMAL NO-UNDO.
        IF Assessment-Roll.Market-Value NE ? THEN vMV = Assessment-Roll.Market-Value.
        ELSE vMV = 0.00.
        
        DEFINE VARIABLE vAV AS DECIMAL NO-UNDO.
        IF Assessment-Roll.Assessed-Value NE ? THEN vAV = Assessment-Roll.Assessed-Value.
        ELSE vAV = 0.00.
        
        totalArea = totalArea + vArea.
        totalAssVal = totalAssVal + vAV.
        
        IF NOT firstItem THEN PUT UNFORMATTED ",".
        firstItem = NO.
        
        DEFINE VARIABLE arpDisplay AS CHARACTER NO-UNDO.
        IF Assessment-Roll.ARP-No LT 9000000 THEN 
            arpDisplay = STRING(Assessment-Roll.Revision-Year,"9999") + "-" + STRING(Assessment-Roll.Barangay-Code, "999") + "-" + STRING(Assessment-Roll.ARP-No, "99999") + (IF Assessment-Roll.ARP-Suffix NE "" THEN "-" + Assessment-Roll.ARP-Suffix ELSE "").
        ELSE 
            arpDisplay = "For Approval".
            
        DEFINE VARIABLE pinDisplay AS CHARACTER NO-UNDO.
        pinDisplay = "024-" + STRING(Assessment-Roll.Barangay-Code, "999") + "-" + Assessment-Roll.Section-No + "-" + Assessment-Roll.Ass-Lot-No + (IF Assessment-Roll.Imp-No NE "" THEN "-" + Assessment-Roll.Imp-No ELSE "").
        
        DEFINE VARIABLE ownerNameStr AS CHARACTER NO-UNDO.
        ownerNameStr = REPLACE(REPLACE(Assessment-Roll.Owner-Name, "~"", "'"), "\", "/").
        
        DEFINE VARIABLE adminStr AS CHARACTER NO-UNDO.
        adminStr = (IF Assessment-Roll.Administrator NE ? THEN REPLACE(REPLACE(Assessment-Roll.Administrator, "~"", "'"), "\", "/") ELSE "").
        
        DEFINE VARIABLE locStr AS CHARACTER NO-UNDO.
        locStr = (IF Assessment-Roll.Property-Location NE ? THEN REPLACE(REPLACE(Assessment-Roll.Property-Location, "~"", "'"), "\", "/") ELSE (bgyName + ", " + locName)).
        
        PUT UNFORMATTED "~{".
        PUT UNFORMATTED q "id" q ":" q "B-" + STRING(Assessment-Roll.Barangay-Code) + "-" + STRING(Assessment-Roll.ARP-No) q ",".
        PUT UNFORMATTED q "arpNo" q ":" q arpDisplay q ",".
        PUT UNFORMATTED q "rawArp" q ":" Assessment-Roll.ARP-No ",".
        PUT UNFORMATTED q "pin" q ":" q pinDisplay q ",".
        PUT UNFORMATTED q "sec" q ":" q Assessment-Roll.Section-No q ",".
        PUT UNFORMATTED q "lot" q ":" q Assessment-Roll.Ass-Lot-No q ",".
        PUT UNFORMATTED q "imp" q ":" q Assessment-Roll.Imp-No q ",".
        PUT UNFORMATTED q "ownerName" q ":" q ownerNameStr q ",".
        PUT UNFORMATTED q "administrator" q ":" q adminStr q ",".
        PUT UNFORMATTED q "address" q ":" q locStr q ",".
        PUT UNFORMATTED q "classCode" q ":" q vClass q ",".
        PUT UNFORMATTED q "bldgDesc" q ":" q REPLACE(vUse, "~"", "'") q ",".
        PUT UNFORMATTED q "area" q ":" vArea ",".
        PUT UNFORMATTED q "unitValue" q ":" vUnit ",".
        PUT UNFORMATTED q "tax" q ":" q vTax q ",".
        PUT UNFORMATTED q "adjustment" q ":" q vAdjust q ",".
        PUT UNFORMATTED q "marketValue" q ":" vMV ",".
        PUT UNFORMATTED q "assessedValue" q ":" vAV ",".
        PUT UNFORMATTED q "status" q ":" q (IF Assessment-Roll.FAAS-Status EQ 1 AND Assessment-Roll.ARP-No GE 9000000 THEN "For Approval" ELSE "Approved") q ",".
        PUT UNFORMATTED q "validated" q ":" (IF Assessment-Roll.Validated THEN "true" ELSE "false") ",".
        PUT UNFORMATTED q "validatedBy" q ":" q (IF Assessment-Roll.Validated THEN "Editha Q Medrano" ELSE "") q ",".
        PUT UNFORMATTED q "validatedDate" q ":" q (IF Assessment-Roll.Validated THEN "06/15/2026" ELSE "") q ",".
        PUT UNFORMATTED q "validatedTime" q ":" q (IF Assessment-Roll.Validated THEN "09:30:00 AM" ELSE "") q.
        PUT UNFORMATTED "~}".
    END.
END.

PUT UNFORMATTED "],".
PUT UNFORMATTED q "totals" q ":~{".
PUT UNFORMATTED q "count" q ":" totalRecs ",".
PUT UNFORMATTED q "totalArea" q ":" totalArea ",".
PUT UNFORMATTED q "totalAssessedValue" q ":" totalAssVal.
PUT UNFORMATTED "~}~}".
OUTPUT CLOSE.
QUIT.
