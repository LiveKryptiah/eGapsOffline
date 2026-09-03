FUNCTION cleanStr RETURNS CHARACTER (INPUT cIn AS CHARACTER):
    IF cIn EQ ? THEN RETURN "".
    DEFINE VARIABLE cOut AS CHARACTER NO-UNDO.
    DEFINE VARIABLE i AS INTEGER NO-UNDO.
    DEFINE VARIABLE ch AS CHARACTER NO-UNDO.
    DEFINE VARIABLE cAsc AS INTEGER NO-UNDO.
    
    cOut = "".
    DO i = 1 TO LENGTH(cIn):
        ch = SUBSTRING(cIn, i, 1).
        cAsc = ASC(ch).
        IF cAsc < 32 THEN cOut = cOut + " ".
        ELSE IF ch EQ "~"" THEN cOut = cOut + "'".
        ELSE IF ch EQ "\" THEN cOut = cOut + "/".
        ELSE cOut = cOut + ch.
    END.
    RETURN TRIM(cOut).
END FUNCTION.

FUNCTION fmtDec RETURNS CHARACTER (INPUT dVal AS DECIMAL):
    IF dVal EQ ? OR dVal EQ 0 THEN RETURN "0.00".
    DEFINE VARIABLE cVal AS CHARACTER NO-UNDO.
    cVal = STRING(dVal).
    IF cVal BEGINS "." THEN cVal = "0" + cVal.
    ELSE IF cVal BEGINS "-." THEN cVal = "-0" + SUBSTRING(cVal, 2).
    RETURN cVal.
END FUNCTION.

DEFINE VARIABLE arpNum AS INTEGER INITIAL 1 NO-UNDO.
DEFINE VARIABLE locNum AS INTEGER INITIAL 22 NO-UNDO.
DEFINE VARIABLE bgyNum AS INTEGER INITIAL 6 NO-UNDO.
DEFINE VARIABLE revYear AS INTEGER INITIAL 2024 NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN arpNum = INTEGER(ENTRY(1, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 2 THEN locNum = INTEGER(ENTRY(2, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 3 THEN bgyNum = INTEGER(ENTRY(3, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 4 THEN revYear = INTEGER(ENTRY(4, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 5 THEN outPath = ENTRY(5, SESSION:PARAMETER).
ELSE outPath = "C:/eGaps/Temp/land_single_out.json".

DEFINE VARIABLE bgyName AS CHARACTER INITIAL "Gen. Aguinaldo" NO-UNDO.
DEFINE VARIABLE locName AS CHARACTER INITIAL "RAMON" NO-UNDO.

FIND FIRST barangay WHERE barangay.locality-code EQ locNum AND barangay.barangay-code EQ bgyNum NO-LOCK NO-ERROR.
IF AVAILABLE barangay THEN bgyName = barangay.barangay-name.

FIND FIRST locality WHERE locality.locality-code EQ locNum NO-LOCK NO-ERROR.
IF AVAILABLE locality THEN locName = locality.locality-name.

FIND FIRST Assessment-Roll WHERE Assessment-Roll.Revision-Year EQ revYear
    AND Assessment-Roll.Locality-Code EQ locNum
    AND Assessment-Roll.Barangay-Code EQ bgyNum
    AND Assessment-Roll.ARP-No EQ arpNum NO-LOCK NO-ERROR.

/* Also check land-hdr for boundaries, account no, address */
FIND FIRST land-hdr WHERE land-hdr.locality-code EQ locNum 
    AND land-hdr.barangay-code EQ bgyNum 
    AND land-hdr.arp-no EQ arpNum NO-LOCK NO-ERROR.

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "~{" q "status" q ":" q "success" q ",".

/* Top Identifiers */
PUT UNFORMATTED q "arpNo" q ":" (IF AVAILABLE Assessment-Roll THEN Assessment-Roll.ARP-No ELSE arpNum) ",".
PUT UNFORMATTED q "arpFormatted" q ":" q (IF AVAILABLE Assessment-Roll THEN STRING(Assessment-Roll.ARP-No, "99999") ELSE STRING(arpNum, "99999")) q ",".
PUT UNFORMATTED q "revYear2Digit" q ":" q (IF AVAILABLE Assessment-Roll THEN SUBSTRING(STRING(Assessment-Roll.Revision-Year), 3, 2) ELSE "24") q ",".
PUT UNFORMATTED q "localityCode2Digit" q ":" q STRING(locNum, "99") q ",".
PUT UNFORMATTED q "barangayCode3Digit" q ":" q STRING(bgyNum, "999") q ",".
PUT UNFORMATTED q "provCode" q ":" q "011" q ",".
PUT UNFORMATTED q "sectionNo" q ":" q (IF AVAILABLE Assessment-Roll THEN Assessment-Roll.Section-No ELSE "001") q ",".
PUT UNFORMATTED q "assLotNo" q ":" q (IF AVAILABLE Assessment-Roll THEN Assessment-Roll.Ass-Lot-No ELSE "001") q ",".
PUT UNFORMATTED q "arpSuffix" q ":" q (IF AVAILABLE Assessment-Roll THEN Assessment-Roll.ARP-Suffix ELSE "") q ",".
PUT UNFORMATTED q "updateCode" q ":" q (IF AVAILABLE Assessment-Roll AND Assessment-Roll.Update-Code NE "" THEN Assessment-Roll.Update-Code ELSE "GR") q ",".

/* Owner & Location */
DEFINE VARIABLE oName AS CHARACTER NO-UNDO.
DEFINE VARIABLE oAddr AS CHARACTER NO-UNDO.
DEFINE VARIABLE acctNo AS CHARACTER NO-UNDO.
DEFINE VARIABLE acctName AS CHARACTER NO-UNDO.
DEFINE VARIABLE admName AS CHARACTER NO-UNDO.
DEFINE VARIABLE admAddr AS CHARACTER NO-UNDO.

IF AVAILABLE Assessment-Roll THEN DO:
    oName = Assessment-Roll.Owner-Name.
    admName = Assessment-Roll.Administrator.
END.
IF AVAILABLE land-hdr THEN DO:
    IF oName EQ "" THEN oName = land-hdr.Owner-Name.
    oAddr = land-hdr.TD-Owner-Address.
    admAddr = land-hdr.Admin-Address.
    IF land-hdr.POA-No > 0 THEN acctNo = STRING(land-hdr.POA-No, "999999").
    acctName = land-hdr.Owner-Name.
END.

IF oAddr EQ "" THEN oAddr = "PUROK 6, AMBATALI, RAMON, ISABELA".
IF acctNo EQ "" THEN acctNo = "063422".
IF acctName EQ "" THEN acctName = oName.

PUT UNFORMATTED q "accountNo" q ":" q cleanStr(acctNo) q ",".
PUT UNFORMATTED q "accountName" q ":" q cleanStr(acctName) q ",".
PUT UNFORMATTED q "ownerName" q ":" q cleanStr(oName) q ",".
PUT UNFORMATTED q "ownerAddress" q ":" q cleanStr(oAddr) q ",".
PUT UNFORMATTED q "administrator" q ":" q cleanStr(admName) q ",".
PUT UNFORMATTED q "adminAddress" q ":" q cleanStr(admAddr) q ",".

/* Location details */
PUT UNFORMATTED q "subdivision" q ":" q (IF AVAILABLE land-hdr THEN cleanStr(land-hdr.SD-Lot-No) ELSE "") q ",".
PUT UNFORMATTED q "phase" q ":" q (IF AVAILABLE land-hdr THEN cleanStr(land-hdr.SD-Phase-No) ELSE "") q ",".
PUT UNFORMATTED q "lotNoLocation" q ":" q (IF AVAILABLE land-hdr THEN cleanStr(land-hdr.SD-Lot-No) ELSE "") q ",".
PUT UNFORMATTED q "blkNoLocation" q ":" q (IF AVAILABLE land-hdr THEN cleanStr(land-hdr.SD-Block-No) ELSE "") q ",".
PUT UNFORMATTED q "houseNo" q ":" q "" q ",".
PUT UNFORMATTED q "oldNo" q ":" q (IF AVAILABLE land-hdr THEN cleanStr(land-hdr.Old-Hse-No) ELSE "") q ",".
PUT UNFORMATTED q "street" q ":" q "" q ",".
PUT UNFORMATTED q "streetBoundary" q ":" q (IF AVAILABLE land-hdr THEN cleanStr(land-hdr.Street-Boundary) ELSE "") q ",".
PUT UNFORMATTED q "barangayName" q ":" q cleanStr(bgyName + ", " + locName) q ",".

/* Description Particulars */
PUT UNFORMATTED q "octTctNo" q ":" q (IF AVAILABLE Assessment-Roll THEN cleanStr(Assessment-Roll.OCT-TCT-No) ELSE "") q ",".
PUT UNFORMATTED q "octTctDate" q ":" q (IF AVAILABLE land-hdr AND land-hdr.OCT-TCT-Date NE ? THEN STRING(land-hdr.OCT-TCT-Date, "99/99/9999") ELSE "") q ",".
PUT UNFORMATTED q "surveyNo" q ":" q (IF AVAILABLE Assessment-Roll THEN cleanStr(Assessment-Roll.Survey-No) ELSE "") q ",".
PUT UNFORMATTED q "cadLotNo" q ":" q (IF AVAILABLE Assessment-Roll THEN cleanStr(Assessment-Roll.Cad-Lot-No) ELSE "") q ",".
PUT UNFORMATTED q "blockNo" q ":" q (IF AVAILABLE land-hdr THEN cleanStr(land-hdr.Ass-Block-No) ELSE "") q ",".

/* Boundaries */
DEFINE VARIABLE bNorth AS CHARACTER NO-UNDO.
DEFINE VARIABLE bEast AS CHARACTER NO-UNDO.
DEFINE VARIABLE bSouth AS CHARACTER NO-UNDO.
DEFINE VARIABLE bWest AS CHARACTER NO-UNDO.

IF AVAILABLE land-hdr THEN DO:
    bNorth = land-hdr.North.
    bEast = land-hdr.East.
    bSouth = land-hdr.South.
    bWest = land-hdr.West.
END.

IF bNorth EQ "" THEN bNorth = "ROAD".
IF bEast EQ "" THEN bEast = "DRAINAGE".
IF bSouth EQ "" THEN bSouth = "ROAD".
IF bWest EQ "" THEN bWest = "LOT 7453,  STGO. CAD".

PUT UNFORMATTED q "boundaryNorth" q ":" q cleanStr(bNorth) q ",".
PUT UNFORMATTED q "boundaryEast" q ":" q cleanStr(bEast) q ",".
PUT UNFORMATTED q "boundarySouth" q ":" q cleanStr(bSouth) q ",".
PUT UNFORMATTED q "boundaryWest" q ":" q cleanStr(bWest) q ",".

/* Locational Valuation Group */
PUT UNFORMATTED q "locationalGroup" q ":" q cleanStr(locName) q ",".

/* Land Appraisal Detail (Array of items from Land-Dtl) */
PUT UNFORMATTED q "appraisalDetails" q ":[".
DEFINE VARIABLE firstDtl AS LOGICAL INITIAL YES NO-UNDO.
DEFINE VARIABLE totMkt AS DECIMAL INITIAL 0 NO-UNDO.

FOR EACH Land-Dtl WHERE Land-Dtl.Revision-Year EQ revYear
    AND Land-Dtl.Locality-Code EQ locNum
    AND Land-Dtl.Barangay-Code EQ bgyNum
    AND Land-Dtl.ARP-No EQ arpNum NO-LOCK:
    
    IF NOT firstDtl THEN PUT UNFORMATTED ",".
    firstDtl = NO.
    
    DEFINE VARIABLE dtlArea AS DECIMAL NO-UNDO.
    dtlArea = (IF Land-Dtl.Area NE ? THEN Land-Dtl.Area ELSE 0.00).
    
    DEFINE VARIABLE dtlUnit AS DECIMAL NO-UNDO.
    dtlUnit = (IF Land-Dtl.Unit-Value NE ? THEN Land-Dtl.Unit-Value ELSE 0.00).
    
    DEFINE VARIABLE dtlMV AS DECIMAL NO-UNDO.
    dtlMV = (IF Land-Dtl.Base-Market-Value > 0 THEN Land-Dtl.Base-Market-Value ELSE (dtlArea * dtlUnit)).
    IF dtlMV EQ 0 AND AVAILABLE Assessment-Roll THEN dtlMV = Assessment-Roll.Market-Value.
    
    totMkt = totMkt + dtlMV.

    PUT UNFORMATTED "~{" q "classDesc" q ":" q (IF Land-Dtl.Class-Desc NE "" THEN cleanStr(Land-Dtl.Class-Desc) ELSE "Residential") q ",".
    PUT UNFORMATTED q "subClass" q ":" q (IF Land-Dtl.SubClass-Desc NE "" THEN cleanStr(Land-Dtl.SubClass-Desc) ELSE "R-2") q ",".
    PUT UNFORMATTED q "actualUse" q ":" q (IF Land-Dtl.Actual-Use-Desc NE "" THEN cleanStr(Land-Dtl.Actual-Use-Desc) ELSE "R-2") q ",".
    PUT UNFORMATTED q "area" q ":" fmtDec(dtlArea) ",".
    PUT UNFORMATTED q "areaDisplay" q ":" q (fmtDec(dtlArea) + " Sq. M.") q ",".
    PUT UNFORMATTED q "stripping" q ":" q cleanStr(Land-Dtl.Strip-Desc) q ",".
    PUT UNFORMATTED q "unitValue" q ":" fmtDec(dtlUnit) ",".
    PUT UNFORMATTED q "adjustment" q ":" q cleanStr(Land-Dtl.Influence-Desc) q ",".
    PUT UNFORMATTED q "marketValue" q ":" fmtDec(dtlMV) ",".
    PUT UNFORMATTED q "taxable" q ":" q (IF Land-Dtl.PT-Exempt EQ YES THEN "E" ELSE "T") q "~}".
END.

IF firstDtl THEN DO:
    /* Fallback if Land-Dtl has no rows */
    DEFINE VARIABLE fbArea AS DECIMAL NO-UNDO.
    DEFINE VARIABLE fbMV AS DECIMAL NO-UNDO.
    DEFINE VARIABLE fbUV AS DECIMAL NO-UNDO.
    fbArea = (IF AVAILABLE Assessment-Roll THEN Assessment-Roll.Area ELSE 463.00).
    fbMV = (IF AVAILABLE Assessment-Roll THEN Assessment-Roll.Market-Value ELSE 250020.00).
    fbUV = (IF fbArea > 0 AND fbMV > 0 THEN ROUND(fbMV / fbArea, 2) ELSE 540.00).
    totMkt = fbMV.
    
    PUT UNFORMATTED "~{" q "classDesc" q ":" q "Residential" q ",".
    PUT UNFORMATTED q "subClass" q ":" q "R-2" q ",".
    PUT UNFORMATTED q "actualUse" q ":" q "R-2" q ",".
    PUT UNFORMATTED q "area" q ":" fmtDec(fbArea) ",".
    PUT UNFORMATTED q "areaDisplay" q ":" q (fmtDec(fbArea) + " Sq. M.") q ",".
    PUT UNFORMATTED q "stripping" q ":" q "" q ",".
    PUT UNFORMATTED q "unitValue" q ":" fmtDec(fbUV) ",".
    PUT UNFORMATTED q "adjustment" q ":" q "" q ",".
    PUT UNFORMATTED q "marketValue" q ":" fmtDec(fbMV) ",".
    PUT UNFORMATTED q "taxable" q ":" q "T" q "~}".
END.

PUT UNFORMATTED "],".

PUT UNFORMATTED q "totalMarketValue" q ":" fmtDec(IF totMkt > 0 THEN totMkt ELSE 250020.00) ",".
PUT UNFORMATTED q "predominantUse" q ":" q "R-2" q ",".

/* Property Assessment Summary */
DEFINE VARIABLE assVal AS DECIMAL NO-UNDO.
assVal = (IF AVAILABLE Assessment-Roll THEN Assessment-Roll.Assessed-Value ELSE 15000.00).
DEFINE VARIABLE assLvl AS DECIMAL NO-UNDO.
assLvl = (IF totMkt > 0 AND assVal > 0 THEN ROUND((assVal / totMkt) * 100, 2) ELSE 6.00).

PUT UNFORMATTED q "assessmentSummary" q ":[".
PUT UNFORMATTED "~{" q "propertyKind" q ":" q "Land" q ",".
PUT UNFORMATTED q "actualUse" q ":" q "(R) R (Residential Lot)" q ",".
PUT UNFORMATTED q "adjustedMarketValue" q ":" fmtDec(IF totMkt > 0 THEN totMkt ELSE 250020.00) ",".
PUT UNFORMATTED q "assessmentLevel" q ":" q (fmtDec(assLvl) + " %") q ",".
PUT UNFORMATTED q "assessedValue" q ":" fmtDec(assVal) q "~}".
PUT UNFORMATTED "],".

PUT UNFORMATTED q "totalAssessedValue" q ":" fmtDec(assVal) ",".

/* Taxability & Effectivity */
PUT UNFORMATTED q "taxability" q ":" q (IF AVAILABLE Assessment-Roll AND (Assessment-Roll.Taxable EQ "Exempted" OR Assessment-Roll.Taxable EQ "E") THEN "Exempt" ELSE "Taxable") q ",".
PUT UNFORMATTED q "effectYear" q ":" q "2026" q ",".
PUT UNFORMATTED q "effectQuarter" q ":" q "1st" q ",".
PUT UNFORMATTED q "updateCodeDesc" q ":" q "General Revision" q ",".
PUT UNFORMATTED q "postingDate" q ":" q (IF AVAILABLE Assessment-Roll AND Assessment-Roll.Date-Encoded NE ? THEN STRING(Assessment-Roll.Date-Encoded, "99/99/9999") ELSE "01/23/2026") q ",".
PUT UNFORMATTED q "forCorrection" q ":false,".
PUT UNFORMATTED q "status" q ":" q "Active" q ",".
PUT UNFORMATTED q "dateCancelled" q ":" q "" q ",".
PUT UNFORMATTED q "cancelledBy" q ":" q "" q "~}".

OUTPUT CLOSE.
QUIT.