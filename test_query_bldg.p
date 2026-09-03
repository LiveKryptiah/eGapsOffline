OUTPUT TO VALUE("C:\eGaps\Temp\bldg_info.txt").
PUT UNFORMATTED "=== ACTIVE REVISIONS ===" SKIP.
FOR EACH Active-Revision NO-LOCK:
    PUT UNFORMATTED "Kind: " Active-Revision.Kind-Code " RevYr: " Active-Revision.Revision-Year " Status: " Active-Revision.FAAS-Status SKIP.
END.

PUT UNFORMATTED SKIP "=== BARANGAYS with BLDG RPUs (Rev 2024) ===" SKIP.
DEFINE VARIABLE cnt AS INTEGER NO-UNDO.
FOR EACH Barangay WHERE Barangay.Locality-Code EQ 22 NO-LOCK:
    cnt = 0.
    FOR EACH Assessment-Roll WHERE Assessment-Roll.Revision-Year EQ 2024 
                             AND Assessment-Roll.Locality-Code EQ 22 
                             AND Assessment-Roll.Barangay-Code EQ Barangay.Barangay-Code 
                             AND Assessment-Roll.Kind-Code EQ "B" NO-LOCK:
        cnt = cnt + 1.
    END.
    IF cnt > 0 THEN 
        PUT UNFORMATTED "Bgy: " STRING(Barangay.Barangay-Code, "999") " " Barangay.Barangay-Name " Count: " cnt SKIP.
END.
OUTPUT CLOSE.
QUIT.
