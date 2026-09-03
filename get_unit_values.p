DEFINE VARIABLE locNum AS INTEGER INITIAL 22 NO-UNDO.
DEFINE VARIABLE revYear AS INTEGER INITIAL 2024 NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER INITIAL "C:/eGaps/Temp/uv_test.json" NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.
DEFINE VARIABLE firstItem AS LOGICAL INITIAL YES NO-UNDO.

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN locNum = INTEGER(ENTRY(1, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 2 THEN revYear = INTEGER(ENTRY(2, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 3 THEN outPath = ENTRY(3, SESSION:PARAMETER).

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "~{" q "status" q ":" q "success" q ",".
PUT UNFORMATTED q "localityCode" q ":" locNum ",".
PUT UNFORMATTED q "revisionYear" q ":" revYear ",".
PUT UNFORMATTED q "schedules" q ":[".

FOR EACH Land-Unit-Value WHERE Land-Unit-Value.Revision-Year EQ revYear
    AND Land-Unit-Value.Locality-Code EQ locNum NO-LOCK:
    
    IF NOT firstItem THEN PUT UNFORMATTED ",".
    firstItem = NO.

    PUT UNFORMATTED "~{" q "classCode" q ":" q Land-Unit-Value.Class-Code q ",".
    PUT UNFORMATTED q "subClassCode" q ":" q Land-Unit-Value.SubClass-Code q ",".
    PUT UNFORMATTED q "subClassDesc" q ":" q Land-Unit-Value.SubClass-Desc q ",".
    PUT UNFORMATTED q "unitValue" q ":" Land-Unit-Value.Unit-Value q "~}".
END.

PUT UNFORMATTED "]~}".
OUTPUT CLOSE.
QUIT.