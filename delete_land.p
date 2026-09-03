DEFINE VARIABLE arpNum AS INTEGER NO-UNDO.
DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

arpNum = INTEGER(ENTRY(1, SESSION:PARAMETER)).
IF NUM-ENTRIES(SESSION:PARAMETER) >= 2 THEN outPath = ENTRY(2, SESSION:PARAMETER).
ELSE outPath = "C:/eGaps/Temp/del_land_out.json".

FIND FIRST Assessment-Roll WHERE Assessment-Roll.Revision-Year EQ 2024 AND Assessment-Roll.ARP-No EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF AVAILABLE Assessment-Roll THEN DELETE Assessment-Roll.

FIND FIRST Land-Dtl WHERE Land-Dtl.Revision-Year EQ 2024 AND Land-Dtl.ARP-No EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF AVAILABLE Land-Dtl THEN DELETE Land-Dtl.

FIND FIRST land-hdr WHERE land-hdr.arp-no EQ arpNum EXCLUSIVE-LOCK NO-ERROR.
IF AVAILABLE land-hdr THEN DELETE land-hdr.

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "~{" q "status" q ":" q "success" q ",".
PUT UNFORMATTED q "arpNo" q ":" arpNum ",".
PUT UNFORMATTED q "message" q ":" q "Record deleted successfully from rpadb database" q "~}".
OUTPUT CLOSE.
QUIT.