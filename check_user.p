/* =========================================================================
   Application : Real Property Assessment System (eRPAS Web)
   Module      : Module 1 - Real-Time User ID Validation (check_user.p)
   Matches     : C:\eGaps\Isabela\Security\eLogin.p
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

DEFINE VARIABLE inUser  AS CHARACTER NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q       AS CHARACTER INITIAL "~"" NO-UNDO.
DEFINE VARIABLE vID     AS CHARACTER NO-UNDO.

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN inUser  = TRIM(ENTRY(1, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 2 THEN outPath = TRIM(ENTRY(2, SESSION:PARAMETER)).

IF outPath EQ "" OR outPath EQ ? THEN outPath = "C:/eGaps/Temp/chk_user.json".

DEFINE VARIABLE foundUser AS LOGICAL INITIAL NO NO-UNDO.
DEFINE VARIABLE uName     AS CHARACTER INITIAL "" NO-UNDO.
DEFINE VARIABLE uPos      AS CHARACTER INITIAL "" NO-UNDO.
DEFINE VARIABLE uOffice   AS CHARACTER INITIAL "" NO-UNDO.
DEFINE VARIABLE uId       AS CHARACTER INITIAL "" NO-UNDO.
DEFINE VARIABLE uLoginId  AS CHARACTER INITIAL "" NO-UNDO.

/* Exact eLogin.p logic: */
ASSIGN vID = ENCODE(ENCODE(inUser)).
FIND FIRST Users WHERE Users.Login-ID EQ vID NO-LOCK NO-ERROR.

IF NOT AVAILABLE Users THEN
    FIND FIRST Users WHERE Users.USER-ID EQ inUser NO-LOCK NO-ERROR.

IF NOT AVAILABLE Users THEN
    FIND FIRST Users WHERE Users.User-Name MATCHES ("*" + inUser + "*") NO-LOCK NO-ERROR.

IF AVAILABLE Users THEN DO:
    foundUser = YES.
    uName     = Users.User-Name.
    uPos      = Users.position.
    uOffice   = Users.office.
    uId       = Users.User-ID.
    uLoginId  = Users.Login-ID.
END.

OUTPUT TO VALUE(outPath).
IF foundUser THEN DO:
    PUT UNFORMATTED "~{" q "found" q ":true,".
    PUT UNFORMATTED q "userName" q ":" q cleanStr(uName) q ",".
    PUT UNFORMATTED q "userId" q ":" q cleanStr(uId) q ",".
    PUT UNFORMATTED q "position" q ":" q cleanStr(uPos) q ",".
    PUT UNFORMATTED q "office" q ":" q cleanStr(uOffice) q "~}".
END.
ELSE DO:
    PUT UNFORMATTED "~{" q "found" q ":false,".
    PUT UNFORMATTED q "error" q ":" q "*** Invalid User ID ***" q "~}".
END.
OUTPUT CLOSE.
QUIT.
