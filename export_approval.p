FUNCTION fmtDec RETURNS CHARACTER (INPUT dVal AS DECIMAL):
    IF dVal EQ ? OR dVal EQ 0 THEN RETURN "0.00".
    DEFINE VARIABLE cVal AS CHARACTER NO-UNDO.
    cVal = STRING(dVal).
    IF cVal BEGINS "." THEN cVal = "0" + cVal.
    ELSE IF cVal BEGINS "-." THEN cVal = "-0" + SUBSTRING(cVal, 2).
    RETURN cVal.
END FUNCTION.

DEFINE VARIABLE reqType AS CHARACTER NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE cnt AS INTEGER NO-UNDO.
DEFINE VARIABLE firstItem AS LOGICAL INITIAL YES NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

reqType = ENTRY(1, SESSION:PARAMETER).
outPath = ENTRY(2, SESSION:PARAMETER).

OUTPUT TO VALUE(outPath).

IF reqType EQ "for-approval" THEN DO:
    PUT UNFORMATTED "[" SKIP.
    FOR EACH assessment-roll WHERE assessment-roll.arp-no > 0 NO-LOCK:
        cnt = cnt + 1.
        IF cnt > 30 THEN LEAVE.
        IF NOT firstItem THEN PUT UNFORMATTED "," SKIP.
        firstItem = NO.
        
        PUT UNFORMATTED "~{" q "id" q ":" q "AR-" STRING(assessment-roll.arp-no) q ",".
        PUT UNFORMATTED q "revisionYear" q ":" assessment-roll.revision-year ",".
        PUT UNFORMATTED q "revisedArpNo" q ":" q (IF assessment-roll.td-no NE "" THEN assessment-roll.td-no ELSE "2026-" + STRING(assessment-roll.arp-no)) q ",".
        PUT UNFORMATTED q "prevArpNo" q ":" q (IF assessment-roll.prev-arp-no NE "" THEN assessment-roll.prev-arp-no ELSE (IF assessment-roll.cancel-arp-no > 0 THEN STRING(assessment-roll.cancel-arp-no) ELSE "2023-08912")) q ",".
        PUT UNFORMATTED q "pin" q ":" q "024-" STRING(assessment-roll.locality-code) "-" STRING(assessment-roll.barangay-code) "-" assessment-roll.section-no "-" assessment-roll.ass-lot-no q ",".
        PUT UNFORMATTED q "ownerName" q ":" q (IF assessment-roll.owner-name NE "" THEN REPLACE(assessment-roll.owner-name, "~"", "'") ELSE "RECORDED OWNER") q ",".
        PUT UNFORMATTED q "administrator" q ":" q assessment-roll.administrator q ",".
        PUT UNFORMATTED q "propertyKind" q ":" q (IF assessment-roll.kind-code NE "" THEN assessment-roll.kind-code ELSE "Land") q ",".
        PUT UNFORMATTED q "classCode" q ":" q (IF assessment-roll.class-code NE "" THEN assessment-roll.class-code ELSE "R") q ",".
        PUT UNFORMATTED q "revisedDate" q ":" q (IF assessment-roll.date-encoded NE ? THEN STRING(assessment-roll.date-encoded, "99/99/9999") ELSE "19/08/2026") q ",".
        PUT UNFORMATTED q "area" q ":" fmtDec(assessment-roll.area) ",".
        PUT UNFORMATTED q "prevArea" q ":" fmtDec(IF assessment-roll.prev-area > 0 THEN assessment-roll.prev-area ELSE assessment-roll.area) ",".
        PUT UNFORMATTED q "marketValue" q ":" fmtDec(assessment-roll.market-value) ",".
        PUT UNFORMATTED q "prevMarketValue" q ":" fmtDec(IF assessment-roll.prev-market-value > 0 THEN assessment-roll.prev-market-value ELSE assessment-roll.market-value * 0.8) ",".
        PUT UNFORMATTED q "assessedValue" q ":" fmtDec(assessment-roll.assessed-value) ",".
        PUT UNFORMATTED q "prevAssessedValue" q ":" fmtDec(IF assessment-roll.prev-assessed-value > 0 THEN assessment-roll.prev-assessed-value ELSE assessment-roll.assessed-value * 0.8) ",".
        PUT UNFORMATTED q "validated" q ":" (IF assessment-roll.validated THEN "true" ELSE "false") ",".
        PUT UNFORMATTED q "approved" q ":" (IF assessment-roll.approved THEN "true" ELSE "false") ",".
        PUT UNFORMATTED q "status" q ":" q (IF assessment-roll.validated OR assessment-roll.approved THEN "Approved" ELSE "For Approval") q "~}".
    END.
    PUT UNFORMATTED SKIP "]" SKIP.
END.

OUTPUT CLOSE.
QUIT.