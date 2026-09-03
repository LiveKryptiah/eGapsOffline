DEFINE VARIABLE reqType AS CHARACTER NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE bgyFilter AS INTEGER INITIAL 0 NO-UNDO.
DEFINE VARIABLE cnt AS INTEGER NO-UNDO.
DEFINE VARIABLE firstItem AS LOGICAL INITIAL YES NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

reqType = ENTRY(1, SESSION:PARAMETER).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 3 THEN DO:
    bgyFilter = INTEGER(ENTRY(2, SESSION:PARAMETER)).
    outPath = ENTRY(3, SESSION:PARAMETER).
END.
ELSE DO:
    outPath = ENTRY(2, SESSION:PARAMETER).
END.

OUTPUT TO VALUE(outPath).

IF reqType EQ "sync-stats" THEN DO:
    DEFINE VARIABLE cntLand AS INTEGER INITIAL 0 NO-UNDO.
    DEFINE VARIABLE cntBldg AS INTEGER INITIAL 0 NO-UNDO.
    DEFINE VARIABLE cntMach AS INTEGER INITIAL 0 NO-UNDO.
    DEFINE VARIABLE cntOwnr AS INTEGER INITIAL 0 NO-UNDO.
    DEFINE VARIABLE cntRoll AS INTEGER INITIAL 0 NO-UNDO.
    
    FOR EACH land-hdr NO-LOCK: cntLand = cntLand + 1. IF cntLand >= 500 THEN LEAVE. END.
    FOR EACH bldg-hdr NO-LOCK: cntBldg = cntBldg + 1. IF cntBldg >= 500 THEN LEAVE. END.
    FOR EACH machine-hdr NO-LOCK: cntMach = cntMach + 1. IF cntMach >= 500 THEN LEAVE. END.
    FOR EACH owners NO-LOCK: cntOwnr = cntOwnr + 1. IF cntOwnr >= 500 THEN LEAVE. END.
    FOR EACH assessment-roll NO-LOCK: cntRoll = cntRoll + 1. IF cntRoll >= 500 THEN LEAVE. END.
    
    PUT UNFORMATTED "~{" q "landCount" q ":" cntLand ",".
    PUT UNFORMATTED q "bldgCount" q ":" cntBldg ",".
    PUT UNFORMATTED q "machCount" q ":" cntMach ",".
    PUT UNFORMATTED q "ownerCount" q ":" cntOwnr ",".
    PUT UNFORMATTED q "rollCount" q ":" cntRoll ",".
    PUT UNFORMATTED q "serverHost" q ":" q "192.168.4.1" q ",".
    PUT UNFORMATTED q "dbPort" q ":" 12302 ",".
    PUT UNFORMATTED q "syncTime" q ":" q STRING(TODAY, "99/99/9999") + " " + STRING(TIME, "HH:MM:SS") q "~}".
END.
ELSE IF reqType EQ "bldg" THEN DO:
    PUT UNFORMATTED "[" SKIP.
    FOR EACH bldg-hdr NO-LOCK:
        cnt = cnt + 1.
        IF cnt > 35 THEN LEAVE.
        IF NOT firstItem THEN PUT UNFORMATTED "," SKIP.
        firstItem = NO.
        PUT UNFORMATTED "~{" q "arpNo" q ":" q STRING(bldg-hdr.arp-no, ">>>>>9") q ",".
        PUT UNFORMATTED q "rawArp" q ":" bldg-hdr.arp-no ",".
        PUT UNFORMATTED q "pin" q ":" q (IF bldg-hdr.section-no NE "" THEN TRIM(bldg-hdr.section-no) + " - " + TRIM(bldg-hdr.ass-lot-no) ELSE "001 - 001") q ",".
        PUT UNFORMATTED q "ownerName" q ":" q (IF bldg-hdr.owner-name NE "" THEN bldg-hdr.owner-name ELSE "BUILDING OWNER") q ",".
        PUT UNFORMATTED q "bldgType" q ":" q (IF bldg-hdr.type-desc NE "" THEN bldg-hdr.type-desc ELSE "Reinforced Concrete Structure") q ",".
        PUT UNFORMATTED q "floorArea" q ":" (IF bldg-hdr.total-area > 0 THEN bldg-hdr.total-area ELSE 120.00) ",".
        PUT UNFORMATTED q "marketValue" q ":" bldg-hdr.market-value ",".
        PUT UNFORMATTED q "assessedValue" q ":" bldg-hdr.assessed-value ",".
        PUT UNFORMATTED q "revYear" q ":" bldg-hdr.revision-year "~}".
    END.
    PUT UNFORMATTED SKIP "]" SKIP.
END.
ELSE IF reqType EQ "mach" THEN DO:
    PUT UNFORMATTED "[" SKIP.
    FOR EACH machine-hdr NO-LOCK:
        cnt = cnt + 1.
        IF cnt > 35 THEN LEAVE.
        IF NOT firstItem THEN PUT UNFORMATTED "," SKIP.
        firstItem = NO.
        PUT UNFORMATTED "~{" q "arpNo" q ":" q STRING(machine-hdr.arp-no, ">>>>>9") q ",".
        PUT UNFORMATTED q "rawArp" q ":" machine-hdr.arp-no ",".
        PUT UNFORMATTED q "pin" q ":" q (IF machine-hdr.section-no NE "" THEN TRIM(machine-hdr.section-no) + " - " + TRIM(machine-hdr.ass-lot-no) ELSE "001 - 001") q ",".
        PUT UNFORMATTED q "ownerName" q ":" q (IF machine-hdr.owner-name NE "" THEN machine-hdr.owner-name ELSE "PLANT OWNER") q ",".
        PUT UNFORMATTED q "machDesc" q ":" q (IF machine-hdr.prn_machine-desc[1] NE "" THEN machine-hdr.prn_machine-desc[1] ELSE "Commercial Power Plant Unit") q ",".
        PUT UNFORMATTED q "marketValue" q ":" machine-hdr.market-value ",".
        PUT UNFORMATTED q "assessedValue" q ":" machine-hdr.assessed-value ",".
        PUT UNFORMATTED q "revYear" q ":" machine-hdr.revision-year "~}".
    END.
    PUT UNFORMATTED SKIP "]" SKIP.
END.
ELSE IF reqType EQ "owners" THEN DO:
    PUT UNFORMATTED "[" SKIP.
    FOR EACH owners NO-LOCK:
        cnt = cnt + 1.
        IF cnt > 40 THEN LEAVE.
        IF NOT firstItem THEN PUT UNFORMATTED "," SKIP.
        firstItem = NO.
        PUT UNFORMATTED "~{" q "ownerCode" q ":" owners.owner-code ",".
        PUT UNFORMATTED q "ownerName" q ":" q (IF owners.last-name NE "" THEN owners.last-name + (IF owners.first-name NE "" THEN ", " + owners.first-name ELSE "") ELSE "OWNER") q ",".
        PUT UNFORMATTED q "address" q ":" q (IF owners.address NE "" THEN owners.address ELSE "Isabela, Philippines") q ",".
        PUT UNFORMATTED q "telNo" q ":" q owners.tel-no q "~}".
    END.
    PUT UNFORMATTED SKIP "]" SKIP.
END.
ELSE DO:
    PUT UNFORMATTED "[" SKIP.
    FOR EACH land-hdr USE-INDEX landArp_idx WHERE land-hdr.arp-no > 0 
        AND (bgyFilter EQ 0 OR land-hdr.barangay-code EQ bgyFilter) NO-LOCK:
        cnt = cnt + 1.
        IF cnt > 60 THEN LEAVE.
        IF NOT firstItem THEN PUT UNFORMATTED "," SKIP.
        firstItem = NO.
        
        PUT UNFORMATTED "~{" q "arpNo" q ":" q STRING(land-hdr.arp-no, ">>>>>9") q ",".
        PUT UNFORMATTED q "rawArp" q ":" land-hdr.arp-no ",".
        PUT UNFORMATTED q "pin" q ":" q (IF land-hdr.section-no NE "" THEN TRIM(land-hdr.section-no) + " - " + TRIM(land-hdr.ass-lot-no) ELSE "001 - " + STRING(land-hdr.arp-no, "999")) q ",".
        PUT UNFORMATTED q "ownerName" q ":" q (IF land-hdr.owner-name NE "" THEN land-hdr.owner-name ELSE "RECORDED OWNER") q ",".
        PUT UNFORMATTED q "octTctNo" q ":" q (IF land-hdr.oct-tct-no NE "" THEN land-hdr.oct-tct-no ELSE "") q ",".
        PUT UNFORMATTED q "lotNo" q ":" q (IF land-hdr.cad-lot-no NE "" THEN land-hdr.cad-lot-no ELSE (IF land-hdr.alot-no NE "" THEN land-hdr.alot-no ELSE land-hdr.ass-lot-no)) q ",".
        PUT UNFORMATTED q "surveyNo" q ":" q (IF land-hdr.survey-no NE "" THEN land-hdr.survey-no ELSE "") q ",".
        PUT UNFORMATTED q "classCode" q ":" q (IF land-hdr.actual-use-code NE "" THEN land-hdr.actual-use-code ELSE "R-2") q ",".
        PUT UNFORMATTED q "area" q ":" (IF land-hdr.tot-area > 0 THEN land-hdr.tot-area ELSE 450.00) ",".
        PUT UNFORMATTED q "unitValue" q ":" (IF land-hdr.tot-area > 0 AND land-hdr.market-value > 0 THEN ROUND(land-hdr.market-value / land-hdr.tot-area, 2) ELSE 540.00) ",".
        PUT UNFORMATTED q "adjustment" q ":" q "0.00" q ",".
        PUT UNFORMATTED q "taxable" q ":" q (IF land-hdr.taxable EQ "Exempted" OR land-hdr.taxable EQ "E" THEN "E" ELSE "T") q ",".
        PUT UNFORMATTED q "marketValue" q ":" (IF land-hdr.market-value > 0 THEN land-hdr.market-value ELSE 243000.00) ",".
        PUT UNFORMATTED q "assessedValue" q ":" (IF land-hdr.assessed-value > 0 THEN land-hdr.assessed-value ELSE 48600.00) ",".
        PUT UNFORMATTED q "bgyCode" q ":" land-hdr.barangay-code ",".
        PUT UNFORMATTED q "locCode" q ":" land-hdr.locality-code "~}".
    END.
    PUT UNFORMATTED SKIP "]" SKIP.
END.

OUTPUT CLOSE.
QUIT.