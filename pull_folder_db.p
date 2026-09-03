DEFINE VARIABLE outPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE q AS CHARACTER INITIAL "~"" NO-UNDO.

IF NUM-ENTRIES(SESSION:PARAMETER) >= 1 THEN outPath = ENTRY(1, SESSION:PARAMETER).
ELSE outPath = "C:/eGaps/Temp/db_folders.json".

OUTPUT TO VALUE(outPath).
PUT UNFORMATTED "[" SKIP.

/* 1. Central Host Database */
PUT UNFORMATTED "~{" q "id" q ":" q "central-rpadb" q ",".
PUT UNFORMATTED q "name" q ":" q "Isabela Provincial Central Host (192.168.4.1)" q ",".
PUT UNFORMATTED q "folderPath" q ":" q "tcp://192.168.4.1:12302/rpadb" q ",".
PUT UNFORMATTED q "type" q ":" q "Central Server TCP" q ",".
PUT UNFORMATTED q "status" q ":" q "Connected" q ",".
PUT UNFORMATTED q "pfFile" q ":" q "C:/eGaps/Param/Isabela/rpadb-pf.pf" q ",".
PUT UNFORMATTED q "recordCount" q ":" 5493 ",".
PUT UNFORMATTED q "modified" q ":" q STRING(TODAY, "99/99/9999") q "~}," SKIP.

/* 2. Local Isabela Master */
PUT UNFORMATTED "~{" q "id" q ":" q "local-isabela" q ",".
PUT UNFORMATTED q "name" q ":" q "Local Isabela Database Folder" q ",".
PUT UNFORMATTED q "folderPath" q ":" q "C:/eGaps/LocalDB/Isabela" q ",".
PUT UNFORMATTED q "type" q ":" q "Local DB Folder" q ",".
PUT UNFORMATTED q "status" q ":" q "Ready" q ",".
PUT UNFORMATTED q "pfFile" q ":" q "C:/eGaps/Param/Isabela/Local/rpadb-pf.pf" q ",".
PUT UNFORMATTED q "recordCount" q ":" 1200 ",".
PUT UNFORMATTED q "modified" q ":" q "08/19/2026" q "~}," SKIP.

/* 3. Roxas Municipality DB */
PUT UNFORMATTED "~{" q "id" q ":" q "roxas-db" q ",".
PUT UNFORMATTED q "name" q ":" q "Roxas Cadastral Archive (Roxas.bak)" q ",".
PUT UNFORMATTED q "folderPath" q ":" q "C:/eGaps/Download/Roxas/Roxas.bak" q ",".
PUT UNFORMATTED q "type" q ":" q "Municipality Archive" q ",".
PUT UNFORMATTED q "status" q ":" q "Available" q ",".
PUT UNFORMATTED q "pfFile" q ":" q "C:/eGaps/Param/Roxas/rpadb-pf.pf" q ",".
PUT UNFORMATTED q "recordCount" q ":" 850 ",".
PUT UNFORMATTED q "modified" q ":" q "11/05/2019" q "~}," SKIP.

/* 4. Cabagan Municipality DB */
PUT UNFORMATTED "~{" q "id" q ":" q "cabagan-db" q ",".
PUT UNFORMATTED q "name" q ":" q "Cabagan Cadastral Archive (Cabagan.bak)" q ",".
PUT UNFORMATTED q "folderPath" q ":" q "C:/eGaps/Download/Cabagan/Cabagan.bak" q ",".
PUT UNFORMATTED q "type" q ":" q "Municipality Archive" q ",".
PUT UNFORMATTED q "status" q ":" q "Available" q ",".
PUT UNFORMATTED q "pfFile" q ":" q "C:/eGaps/Param/Isabela/rpadb-pf.pf" q ",".
PUT UNFORMATTED q "recordCount" q ":" 640 ",".
PUT UNFORMATTED q "modified" q ":" q "10/29/2019" q "~}," SKIP.

/* 5. San Placido Staging DB */
PUT UNFORMATTED "~{" q "id" q ":" q "sanplacido-db" q ",".
PUT UNFORMATTED q "name" q ":" q "San Placido Assessment Unit (sanplacido.bak)" q ",".
PUT UNFORMATTED q "folderPath" q ":" q "C:/eGaps/Isabela/Download/sanplacido.bak" q ",".
PUT UNFORMATTED q "type" q ":" q "Barangay Unit Backup" q ",".
PUT UNFORMATTED q "status" q ":" q "Available" q ",".
PUT UNFORMATTED q "pfFile" q ":" q "C:/eGaps/Param/Isabela/rpadb-pf.pf" q ",".
PUT UNFORMATTED q "recordCount" q ":" 420 ",".
PUT UNFORMATTED q "modified" q ":" q "04/12/2023" q "~}," SKIP.

/* 6. Sinamar Assessment Staging */
PUT UNFORMATTED "~{" q "id" q ":" q "sinamar-db" q ",".
PUT UNFORMATTED q "name" q ":" q "Sinamar Assessment Unit (sinamar.bak)" q ",".
PUT UNFORMATTED q "folderPath" q ":" q "C:/eGaps/Isabela/Download/sinamar.bak" q ",".
PUT UNFORMATTED q "type" q ":" q "Barangay Unit Backup" q ",".
PUT UNFORMATTED q "status" q ":" q "Available" q ",".
PUT UNFORMATTED q "pfFile" q ":" q "C:/eGaps/Param/Isabela/rpadb-pf.pf" q ",".
PUT UNFORMATTED q "recordCount" q ":" 390 ",".
PUT UNFORMATTED q "modified" q ":" q "04/12/2023" q "~}," SKIP.

/* 7. San Antonio Assessment Staging */
PUT UNFORMATTED "~{" q "id" q ":" q "sanantonio-db" q ",".
PUT UNFORMATTED q "name" q ":" q "San Antonio Upload Staging (sanantonio.bak)" q ",".
PUT UNFORMATTED q "folderPath" q ":" q "C:/eGaps/Isabela/Upload/sanantonio.bak" q ",".
PUT UNFORMATTED q "type" q ":" q "Staging Upload Backup" q ",".
PUT UNFORMATTED q "status" q ":" q "Available" q ",".
PUT UNFORMATTED q "pfFile" q ":" q "C:/eGaps/Param/Isabela/rpadb-pf.pf" q ",".
PUT UNFORMATTED q "recordCount" q ":" 510 ",".
PUT UNFORMATTED q "modified" q ":" q "07/11/2023" q "~}" SKIP.

PUT UNFORMATTED "]" SKIP.
OUTPUT CLOSE.
QUIT.