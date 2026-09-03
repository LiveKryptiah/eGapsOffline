/* =========================================================================
   Application : Real Property Assessment System (eRPAS Web)
   Module      : Get Active User Accounts List (get_users.p)
   Platform    : Progress OpenEdge 9.1E / 10.x ABL -> JSON Bridge
   ========================================================================= */

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

DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q       AS CHARACTER INITIAL "~"" NO-UNDO.
DEFINE VARIABLE firstU  AS LOGICAL INITIAL YES NO-UNDO.

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN outPath = TRIM(ENTRY(1, SESSION:PARAMETER)).
IF outPath EQ "" OR outPath EQ ? THEN outPath = "C:/eGaps/Temp/users_out.json".

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "[" SKIP.

FOR EACH users WHERE users.User-Name NE "" NO-LOCK BY users.User-Name:
    IF NOT firstU THEN PUT UNFORMATTED "," SKIP.
    firstU = NO.
    PUT UNFORMATTED "~{" q "userId" q ":" q cleanStr(users.User-ID) q ",".
    PUT UNFORMATTED q "userName" q ":" q cleanStr(users.User-Name) q ",".
    PUT UNFORMATTED q "position" q ":" q cleanStr(users.position) q ",".
    PUT UNFORMATTED q "office" q ":" q cleanStr(users.office) q "~}".
END.

PUT UNFORMATTED SKIP "]" SKIP.
OUTPUT CLOSE.
QUIT.
