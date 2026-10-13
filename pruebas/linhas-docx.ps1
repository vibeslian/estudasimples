param([string]$Entrada, [string]$Saida)
# Abre cada .docx real (Word oculto, sin ventanas) y devuelve la línea en que cae cada palabra del párrafo indicado.
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0; $w.ScreenUpdating = $false
try {
  $itens = Get-Content -Raw -Encoding UTF8 $Entrada | ConvertFrom-Json
  $res = New-Object System.Collections.ArrayList
  foreach ($it in $itens) {
    $d = $w.Documents.Open([string]$it.docx, $false, $true, $false)
    $linhas = New-Object System.Collections.ArrayList
    $alvo = [string]$it.texto
    foreach ($p in $d.Paragraphs) {
      $t = [string]$p.Range.Text
      if ($t.StartsWith($alvo.Substring(0, [Math]::Min(25, $alvo.Length)))) {
        $ini = $p.Range.Start
        $i = 0
        while ($i -lt $t.Length) {
          while ($i -lt $t.Length -and ($t[$i] -eq ' ' -or $t[$i] -eq [char]13)) { $i++ }
          if ($i -ge $t.Length) { break }
          $r = $d.Range($ini + $i, $ini + $i + 1)
          $null = $linhas.Add([int]$r.Information(10))
          while ($i -lt $t.Length -and $t[$i] -ne ' ' -and $t[$i] -ne [char]13) { $i++ }
        }
        break
      }
    }
    $d.Close($false)
    $null = $res.Add($linhas)
  }
  ConvertTo-Json -InputObject @($res) -Compress -Depth 4 | Set-Content -Path $Saida -Encoding UTF8
  Write-Output "ok $($itens.Count)"
} finally { $w.Quit() }
