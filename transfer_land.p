DEFINE VARIABLE oldArp AS INTEGER NO-UNDO.
DEFINE VARIABLE newArp AS INTEGER NO-UNDO.
DEFINE VARIABLE newBgy AS INTEGER NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN oldArp = INTEGER(ENTRY(1, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 2 THEN newArp = INTEGER(ENTRY(2, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 3 THEN newBgy = INTEGER(ENTRY(3, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 4 THEN outPath = ENTRY(4, SESSION:PARAMETER).
ELSE outPath = "C:/eGaps/Temp/trans_land_out.json".

FIND FIRST land-hdr WHERE land-hdr.arp-no EQ oldArp EXCLUSIVE-LOCK NO-ERROR.
IF AVAILABLE land-hdr THEN DO:
    IF newArp > 0 THEN DO:
        land-hdr.arp-no = newArp.
        land-hdr.taxdec-no = newArp.
    END.
    IF newBgy > 0 THEN DO:
        land-hdr.barangay-code = newBgy.
    END.
END.

FOR EACH property-owners WHERE property-owners.arp-no EQ oldArp EXCLUSIVE-LOCK:
    IF newArp > 0 THEN property-owners.arp-no = newArp.
    IF newBgy > 0 THEN property-owners.barangay-code = newBgy.
END.

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "~{" q "status" q ":" q "success" q ",".
PUT UNFORMATTED q "oldArp" q ":" oldArp ",".
PUT UNFORMATTED q "newArp" q ":" (IF newArp > 0 THEN newArp ELSE oldArp) ",".
PUT UNFORMATTED q "newBgy" q ":" newBgy ",".
PUT UNFORMATTED q "message" q ":" q "Property transfer/renumbering successful in rpadb" q "~}".
OUTPUT CLOSE.
QUIT.