DEFINE VARIABLE bgyNum AS INTEGER INITIAL 6 NO-UNDO.
DEFINE VARIABLE locNum AS INTEGER INITIAL 22 NO-UNDO.
DEFINE VARIABLE approvedOnly AS LOGICAL INITIAL NO NO-UNDO.
DEFINE VARIABLE revYear AS INTEGER INITIAL 2024 NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER NO-UNDO.
q = CHR(34).

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN bgyNum = INTEGER(ENTRY(1, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 2 THEN locNum = INTEGER(ENTRY(2, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 3 THEN approvedOnly = (ENTRY(3, SESSION:PARAMETER) EQ 'YES' OR ENTRY(3, SESSION:PARAMETER) EQ 'TRUE').
IF NUM-ENTRIES(SESSION:PARAMETER) >= 4 THEN outPath = ENTRY(4, SESSION:PARAMETER).
ELSE outPath = 'C:/eGaps/Temp/land_api_out.json'.

DEFINE VARIABLE bgyName AS CHARACTER INITIAL 'Gen. Aguinaldo' NO-UNDO.
DEFINE VARIABLE locName AS CHARACTER INITIAL 'RAMON' NO-UNDO.
DEFINE VARIABLE totalArea AS DECIMAL INITIAL 0 NO-UNDO.
DEFINE VARIABLE totalAssVal AS DECIMAL INITIAL 0 NO-UNDO.
DEFINE VARIABLE totalRecs AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE firstItem AS LOGICAL INITIAL YES NO-UNDO.

FIND FIRST barangay WHERE barangay.locality-code EQ locNum AND barangay.barangay-code EQ bgyNum NO-LOCK NO-ERROR.
IF AVAILABLE barangay THEN bgyName = barangay.barangay-name.

FIND FIRST locality WHERE locality.locality-code EQ locNum NO-LOCK NO-ERROR.
IF AVAILABLE locality THEN locName = locality.locality-name.

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED '{' q 'summary' q ':{'.
PUT UNFORMATTED q 'barangayCode' q ':' bgyNum ','.
PUT UNFORMATTED q 'barangayName' q ':' q REPLACE(REPLACE(bgyName, CHR(34), CHR(39)), CHR(92), '/') q ','.
PUT UNFORMATTED q 'localityCode' q ':' locNum ','.
PUT UNFORMATTED q 'localityName' q ':' q REPLACE(REPLACE(locName, CHR(34), CHR(39)), CHR(92), '/') q ','.
PUT UNFORMATTED q 'revisionYear' q ':' revYear ','.
PUT UNFORMATTED q 'fullBarangayTag' q ':' q REPLACE(REPLACE(bgyName + ', ' + CAPS(locName), CHR(34), CHR(39)), CHR(92), '/') q '},'.

PUT UNFORMATTED q 'records' q ':['.

IF locNum > 0 AND bgyNum > 0 THEN DO:
    FOR EACH Assessment-Roll USE-INDEX assroll_idx
        WHERE Assessment-Roll.Revision-Year EQ revYear
        AND Assessment-Roll.Locality-Code EQ locNum
        AND Assessment-Roll.Barangay-Code EQ bgyNum
        AND Assessment-Roll.Kind-Code EQ 'L'
        AND (NOT approvedOnly OR Assessment-Roll.ARP-No LT 9000000) NO-LOCK:
        
        totalRecs = totalRecs + 1.
        
        FIND FIRST Land-Dtl WHERE Land-Dtl.Revision-Year EQ Assessment-Roll.Revision-Year
            AND Land-Dtl.Locality-Code EQ Assessment-Roll.Locality-Code
            AND Land-Dtl.Barangay-Code EQ Assessment-Roll.Barangay-Code
            AND Land-Dtl.ARP-No EQ Assessment-Roll.ARP-No
            AND Land-Dtl.ARP-Suffix EQ Assessment-Roll.ARP-Suffix NO-LOCK NO-ERROR.

        DEFINE VARIABLE vArea AS DECIMAL NO-UNDO.
        IF AVAILABLE Land-Dtl AND Land-Dtl.Area NE ? THEN 
            vArea = (IF Land-Dtl.Dtl-Type EQ 1 THEN Land-Dtl.Area ELSE Land-Dtl.FB-No).
        ELSE IF Assessment-Roll.Area NE ? THEN 
            vArea = Assessment-Roll.Area.
        ELSE 
            vArea = 0.00.
            
        DEFINE VARIABLE vUnit AS DECIMAL NO-UNDO.
        IF AVAILABLE Land-Dtl AND Land-Dtl.Unit-Value NE ? THEN vUnit = Land-Dtl.Unit-Value.
        ELSE IF Assessment-Roll.Area > 0 AND Assessment-Roll.Market-Value > 0 THEN 
            vUnit = ROUND(Assessment-Roll.Market-Value / Assessment-Roll.Area, 2).
        ELSE vUnit = 0.00.
        
        DEFINE VARIABLE vClass AS CHARACTER NO-UNDO.
        IF AVAILABLE Land-Dtl AND Land-Dtl.SubClass-Code NE ? AND Land-Dtl.SubClass-Code NE '' THEN DO:
            IF Land-Dtl.Class-Code EQ 'A' THEN DO:
                IF Land-Dtl.Dtl-Type EQ 1 THEN vClass = Land-Dtl.Actual-Use-Desc.
                ELSE vClass = Land-Dtl.PT-Desc.
            END.
            ELSE IF Land-Dtl.Class-Code BEGINS 'S' THEN vClass = Land-Dtl.Class-Code.
            ELSE vClass = Land-Dtl.SubClass-Desc.
        END.
        ELSE IF Assessment-Roll.Actual-Use-Code NE '' THEN vClass = Assessment-Roll.Actual-Use-Code.
        ELSE IF Assessment-Roll.Class-Code NE '' THEN vClass = Assessment-Roll.Class-Code.
        ELSE vClass = 'R-4'.
        
        DEFINE VARIABLE vAdjust AS CHARACTER NO-UNDO.
        IF AVAILABLE Land-Dtl AND Land-Dtl.Class-Code NE ? THEN DO:
            IF Land-Dtl.Class-Code NE 'A' THEN DO:
                IF Land-Dtl.Influence-Desc NE ? AND Land-Dtl.Influence-Desc NE '' THEN vAdjust = Land-Dtl.Influence-Desc.
                ELSE IF Land-Dtl.Strip-Desc NE '' THEN vAdjust = SUBSTRING(Land-Dtl.Strip-Desc, 1, 9).
            END.
        END.
        
        DEFINE VARIABLE vTax AS CHARACTER NO-UNDO.
        IF AVAILABLE Land-Dtl AND Land-Dtl.PT-Exempt EQ YES THEN
            vTax = 'E'.
        ELSE IF Assessment-Roll.Taxable EQ 'Exempted' OR Assessment-Roll.Taxable EQ 'E' THEN
            vTax = 'E'.
        ELSE
            vTax = 'T'.
            
        DEFINE VARIABLE vMV AS DECIMAL NO-UNDO.
        IF Assessment-Roll.Market-Value NE ? THEN vMV = Assessment-Roll.Market-Value.
        ELSE vMV = 0.00.
        
        DEFINE VARIABLE vAV AS DECIMAL NO-UNDO.
        IF Assessment-Roll.Assessed-Value NE ? THEN vAV = Assessment-Roll.Assessed-Value.
        ELSE vAV = 0.00.

        DEFINE VARIABLE oName AS CHARACTER NO-UNDO.
        oName = Assessment-Roll.Owner-Name + (IF Assessment-Roll.Administrator NE '' THEN ' (' + TRIM(Assessment-Roll.Administrator) + ')' ELSE '').
        IF oName EQ '' THEN oName = 'RECORDED OWNER'.
        oName = REPLACE(REPLACE(oName, CHR(34), CHR(39)), CHR(92), '/').
        
        DEFINE VARIABLE octNo AS CHARACTER NO-UNDO.
        octNo = REPLACE(REPLACE(Assessment-Roll.OCT-TCT-No, CHR(34), CHR(39)), CHR(92), '/').
        
        DEFINE VARIABLE cadLot AS CHARACTER NO-UNDO.
        cadLot = REPLACE(REPLACE(Assessment-Roll.Cad-Lot-No, CHR(34), CHR(39)), CHR(92), '/').
        
        DEFINE VARIABLE survNo AS CHARACTER NO-UNDO.
        survNo = REPLACE(REPLACE(Assessment-Roll.Survey-No, CHR(34), CHR(39)), CHR(92), '/').

        totalArea = totalArea + vArea.
        totalAssVal = totalAssVal + vAV.
        
        IF NOT firstItem THEN PUT UNFORMATTED ','.
        firstItem = NO.

        DEFINE VARIABLE cArpFormatted AS CHARACTER NO-UNDO.
        IF Assessment-Roll.ARP-No >= 9000000 THEN
            cArpFormatted = 'For Approval'.
        ELSE
            cArpFormatted = STRING(Assessment-Roll.ARP-No, '99999').

        PUT UNFORMATTED '{' q 'arpNo' q ':' q cArpFormatted q ','.
        PUT UNFORMATTED q 'rawArp' q ':' Assessment-Roll.arp-no ','.
        PUT UNFORMATTED q 'pin' q ':' q TRIM(Assessment-Roll.Section-No + ' - ' + Assessment-Roll.Ass-Lot-No) q ','.
        PUT UNFORMATTED q 'sectionNo' q ':' q Assessment-Roll.section-no q ','.
        PUT UNFORMATTED q 'assLotNo' q ':' q Assessment-Roll.ass-lot-no q ','.
        PUT UNFORMATTED q 'ownerName' q ':' q oName q ','.
        PUT UNFORMATTED q 'octTctNo' q ':' q octNo q ','.
        PUT UNFORMATTED q 'lotNo' q ':' q cadLot q ','.
        PUT UNFORMATTED q 'surveyNo' q ':' q survNo q ','.
        PUT UNFORMATTED q 'classCode' q ':' q vClass q ','.
        PUT UNFORMATTED q 'area' q ':' vArea ','.
        PUT UNFORMATTED q 'unitValue' q ':' vUnit ','.
        PUT UNFORMATTED q 'adjustment' q ':' q vAdjust q ','.
        PUT UNFORMATTED q 'taxable' q ':' q vTax q ','.
        PUT UNFORMATTED q 'marketValue' q ':' vMV ','.
        PUT UNFORMATTED q 'assessedValue' q ':' vAV ','.
        PUT UNFORMATTED q 'bgyCode' q ':' Assessment-Roll.barangay-code ','.
        PUT UNFORMATTED q 'locCode' q ':' Assessment-Roll.locality-code '}'.
    END.
END.

PUT UNFORMATTED '],'.
PUT UNFORMATTED q 'totalRecs' q ':' totalRecs ','.
PUT UNFORMATTED q 'totalArea' q ':' totalArea ','.
PUT UNFORMATTED q 'totalAssVal' q ':' totalAssVal '}'.
OUTPUT CLOSE.
QUIT.
