# Builds readme-assets/trophies.svg
# Animated trophy case card (house neon style) with the live trophy strip embedded.
# Re-run this script and commit the output whenever the trophy set changes.
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outPath = Join-Path $scriptDir "..\readme-assets\trophies.svg"
$trophyUrl = "https://trophy.ryglcloud.net/?username=Eagl3Eyes&theme=tokyonight&column=-1&margin-w=8&margin-h=8"
$font = "'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif"

# ---------- fetch the live trophy strip ----------
$strip = $null
for ($t = 0; $t -lt 3; $t++) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri $trophyUrl -TimeoutSec 30
        if ($r.StatusCode -eq 200 -and $r.Content -match '<svg') { $strip = $r.Content; break }
    } catch { Start-Sleep -Seconds 2 }
}
if (-not $strip) { throw "Failed to fetch trophy strip from $trophyUrl" }

$strip = ($strip -replace '^\s*<\?xml[\s\S]*?\?>', '').Trim()

# root dimensions
if ($strip -match '<svg\s+width="(\d+(?:\.\d+)?)"\s+height="(\d+(?:\.\d+)?)"') {
    $sw = [double]$Matches[1]; $sh = [double]$Matches[2]
} elseif ($strip -match 'viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"') {
    $sw = [double]$Matches[1]; $sh = [double]$Matches[2]
} else { throw "Cannot parse trophy strip dimensions" }

# trophy labels -> README alt text
$labels = @()
foreach ($m in [regex]::Matches($strip, '<text[^>]*>([^<]+)</text>')) {
    $v = $m.Groups[1].Value.Trim()
    if ($v -and $v -notmatch '^\d+$') { $labels += $v }
}
$altText = (($labels | Select-Object -Unique) -join ', ')

# guard against id collisions with this document's defs
$renamed = @()
foreach ($id in @('grad', 'bg', 'shine', 'glow', 'star')) {
    if ($strip -match ('id="' + $id + '"')) {
        $strip = $strip -replace ('id="' + $id + '"'), ('id="ts-' + $id + '"')
        $strip = $strip -replace ('url\(#' + $id + '\)'), ('url(#ts-' + $id + ')')
        $strip = $strip -replace ('href="#' + $id + '"'), ('href="#ts-' + $id + '"')
        $renamed += $id
    }
}

# ---------- layout ----------
$targetW = 870.0
$scale = $targetW / $sw
$dw = [Math]::Round($sw * $scale, 1)
$dh = [Math]::Round($sh * $scale, 1)
$dx = [Math]::Round((920 - $dw) / 2, 1)
$dy = 94.0
$bgBottom = [Math]::Round(($dy + $dh) + 22, 0)
$bgH = $bgBottom - 6
$svgH = $bgBottom + 6
$borderH = $bgH - 1
$particleVals = ($bgBottom - 8).ToString() + ';14'
$sparkY = $bgBottom - 12

# strip inner content (root wrapper removed, re-embedded as nested svg)
$stripInner = $strip -replace '^\s*<svg[^>]*>', '' -replace '</svg>\s*$', ''
$nested = ('<svg x="' + $dx + '" y="' + $dy + '" width="' + $dw + '" height="' + $dh +
           '" viewBox="0 0 ' + $sw + ' ' + $sh + '" preserveAspectRatio="xMidYMid meet">' +
           $stripInner + '</svg>')

# ---------- document ----------
$p = @()
$p += '<svg xmlns="http://www.w3.org/2000/svg" width="920" height="' + $svgH + '" viewBox="0 0 920 ' + $svgH + '" role="img" aria-labelledby="trTitle trDesc">'
$p += '  <title id="trTitle">Trophies</title>'
$p += '  <desc id="trDesc">Animated trophy case card. Earned trophies: ' + ($altText -replace '&', '&amp;') + '</desc>'
$p += '  <defs>'
$p += '    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">'
$p += '      <stop offset="0%" stop-color="#58a6ff"><animate attributeName="stop-color" values="#58a6ff;#bf91f3;#ff7eb6;#2dd4bf;#58a6ff" dur="10s" repeatCount="indefinite"/></stop>'
$p += '      <stop offset="50%" stop-color="#bf91f3"><animate attributeName="stop-color" values="#bf91f3;#ff7eb6;#2dd4bf;#58a6ff;#bf91f3" dur="10s" repeatCount="indefinite"/></stop>'
$p += '      <stop offset="100%" stop-color="#ff7eb6"><animate attributeName="stop-color" values="#ff7eb6;#2dd4bf;#58a6ff;#bf91f3;#ff7eb6" dur="10s" repeatCount="indefinite"/></stop>'
$p += '    </linearGradient>'
$p += '    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">'
$p += '      <stop offset="0%" stop-color="#0d1117"/><stop offset="55%" stop-color="#161b22"/><stop offset="100%" stop-color="#1c2230"/>'
$p += '    </linearGradient>'
$p += '    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">'
$p += '      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>'
$p += '      <animateTransform attributeName="gradientTransform" type="translate" values="-1 0; 1 0" dur="3s" repeatCount="indefinite"/>'
$p += '    </linearGradient>'
$p += '    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter>'
$p += '    <path id="star" d="M0,-17 C2,-7 7,-2 17,0 C7,2 2,7 0,17 C-2,7 -7,2 -17,0 C-7,-2 -2,-7 0,-17 Z"/>'
$p += '  </defs>'
$p += ''
$p += '  <rect x="6" y="6" width="908" height="' + $bgH + '" rx="18" fill="url(#bg)" fill-opacity="0.96"/>'
$p += ''
$p += '  <!-- floating particles -->'
$particles = @( @(150,'#58a6ff',9,0), @(330,'#bf91f3',11,2), @(560,'#2dd4bf',8,4), @(780,'#ff7eb6',10,1) )
foreach ($c in $particles) {
    $p += '  <circle cx="' + $c[0] + '" r="2.5" fill="' + $c[1] + '">'
    $p += '    <animate attributeName="cy" values="' + $particleVals + '" dur="' + $c[2] + 's" begin="' + $c[3] + 's" repeatCount="indefinite"/>'
    $p += '    <animate attributeName="opacity" values="0;0.8;0.8;0" keyTimes="0;0.15;0.8;1" dur="' + $c[2] + 's" begin="' + $c[3] + 's" repeatCount="indefinite"/>'
    $p += '  </circle>'
}
$p += ''
$p += '  <!-- marching neon border -->'
$p += '  <rect x="6.5" y="6.5" width="907" height="' + $borderH + '" rx="18" fill="none" stroke="#30363d" stroke-width="1"/>'
$p += '  <rect x="6.5" y="6.5" width="907" height="' + $borderH + '" rx="18" fill="none" stroke="url(#grad)" stroke-width="2.5" stroke-dasharray="100 350" stroke-linecap="round">'
$p += '    <animate attributeName="stroke-dashoffset" values="0;-900" dur="7s" repeatCount="indefinite"/>'
$p += '  </rect>'
$p += ''
$p += '  <!-- title (glow + gradient + sweep), bobbing -->'
$p += '  <g>'
$p += '    <animateTransform attributeName="transform" type="translate" values="0 0; 0 -2; 0 0" dur="4s" repeatCount="indefinite"/>'
$p += '    <text x="460" y="54" text-anchor="middle" font-family="' + $font + '" font-size="26" font-weight="800" letter-spacing="8" fill="url(#grad)" filter="url(#glow)" opacity="0.5">TROPHIES</text>'
$p += '    <text x="460" y="54" text-anchor="middle" font-family="' + $font + '" font-size="26" font-weight="800" letter-spacing="8" fill="url(#grad)">TROPHIES</text>'
$p += '    <text x="460" y="54" text-anchor="middle" font-family="' + $font + '" font-size="26" font-weight="800" letter-spacing="8" fill="url(#shine)">TROPHIES</text>'
$p += '  </g>'
$p += '  <rect x="400" y="66" width="120" height="3" rx="1.5" fill="url(#grad)"><animate attributeName="opacity" values="1;0.35;1" dur="4s" repeatCount="indefinite"/></rect>'
$p += ''
$p += '  <!-- real trophy strip -->'
$p += '  ' + $nested
$p += ''
$p += '  <!-- sparkles -->'
$p += '  <g transform="translate(320,30)"><use href="#star" fill="url(#grad)" transform="scale(0.4)"><animateTransform attributeName="transform" type="scale" values="0.28;0.55;0.28" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;1;0.3" dur="2.6s" repeatCount="indefinite"/></use></g>'
$p += '  <g transform="translate(600,30)"><use href="#star" fill="url(#grad)" transform="scale(0.4)"><animateTransform attributeName="transform" type="scale" values="0.55;0.28;0.55" dur="3.1s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.3;1" dur="3.1s" repeatCount="indefinite"/></use></g>'
$p += '  <g transform="translate(26,' + $sparkY + ')"><use href="#star" fill="#ffffff" transform="scale(0.4)"><animateTransform attributeName="transform" type="scale" values="0.28;0.5;0.28" dur="3.3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.25;0.9;0.25" dur="3.3s" repeatCount="indefinite"/></use></g>'
$p += '  <g transform="translate(894,' + $sparkY + ')"><use href="#star" fill="#ffffff" transform="scale(0.4)"><animateTransform attributeName="transform" type="scale" values="0.5;0.28;0.5" dur="2.7s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0.25;0.9" dur="2.7s" repeatCount="indefinite"/></use></g>'
$p += '</svg>'

$doc = $p -join "`n"
[IO.File]::WriteAllText($outPath, $doc, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("WROTE " + $outPath + " (" + $doc.Length + " bytes)")
Write-Output ("strip: " + $sw + "x" + $sh + " -> scaled " + $dw + "x" + $dh + " at (" + $dx + "," + $dy + "); svg 920x" + $svgH)
if ($renamed.Count) { Write-Output ("renamed colliding ids: " + ($renamed -join ', ')) }
Write-Output ("ALT TEXT: " + $altText)
