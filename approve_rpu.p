DEFINE VARIABLE arpNum AS INTEGER NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

arpNum = INTEGER(ENTRY(1, SESSION:PARAMETER)).
outPath = ENTRY(2, SESSION:PARAMETER).

OUTPUT TO VALUE(outPath).

FIND FIRST assessment-roll WHERE assessment-roll.arp-no EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF AVAILABLE assessment-roll THEN DO:
    ASSIGN assessment-roll.validated = YES
           assessment-roll.approved = YES
           assessment-roll.approval-date = TODAY
           assessment-roll.approving-officer = "Guillermo B. Barretto".
    PUT UNFORMATTED "~{" q "status" q ":" q "success" q "," q "message" q ":" q "Assessment ARP " STRING(arpNum) " approved successfully." q "~}".
END.
ELSE DO:
    PUT UNFORMATTED "~{" q "status" q ":" q "error" q "," q "message" q ":" q "Record with ARP " STRING(arpNum) " not found." q "~}".
END.

OUTPUT CLOSE.
QUIT.