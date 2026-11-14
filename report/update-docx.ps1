# Opens the generated .docx in Word, updates the Table of Contents and page-reference fields,
# saves it, and exports a PDF. Usage: powershell -ExecutionPolicy Bypass -File update-docx.ps1 <in.docx> <out.docx> <out.pdf>
param([string]$InDocx, [string]$OutDocx, [string]$OutPdf)
$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open((Resolve-Path $InDocx).Path, $false, $false)
  # Two rounds: the TOC length can move later pages, so update again after the first pass.
  for ($i = 0; $i -lt 2; $i++) {
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Fields.Update() | Out-Null
    foreach ($sec in $doc.Sections) { foreach ($f in $sec.Footers) { $f.Range.Fields.Update() | Out-Null } }
    $doc.Repaginate()
  }
  $doc.SaveAs2($OutDocx, 16)          # wdFormatDocumentDefault (.docx)
  $doc.ExportAsFixedFormat($OutPdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1, $true, $true, $false) # PDF with document properties and heading bookmarks
  "pages: " + $doc.ComputeStatistics(2) # wdStatisticPages
  $doc.Close($false)
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
