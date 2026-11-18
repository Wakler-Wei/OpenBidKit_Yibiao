param([switch]$Finish)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = $PSScriptRoot
$vectorRoot = Join-Path $assetRoot 'svg'
$pngRoot = Join-Path $assetRoot 'png'
New-Item -ItemType Directory -Force $vectorRoot,$pngRoot | Out-Null

function Write-GeneratedSvg([string]$Name,[string]$Content) {
  [IO.File]::WriteAllText((Join-Path $vectorRoot $Name),$Content,[Text.UTF8Encoding]::new($false))
}

function Get-TextOutline([string]$Text,[single]$Size,[single]$X,[single]$Y) {
  $fontFamily = [Drawing.FontFamily]::new('Microsoft YaHei')
  $path = [Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddString($Text,$fontFamily,[int][Drawing.FontStyle]::Bold,$Size,[Drawing.PointF]::new($X,$Y),[Drawing.StringFormat]::GenericTypographic)
  $points = $path.PathPoints
  $types = $path.PathTypes
  $builder = [Text.StringBuilder]::new()
  $culture = [Globalization.CultureInfo]::InvariantCulture
  function Coordinate($p) { return $p.X.ToString('0.###',$culture)+','+$p.Y.ToString('0.###',$culture) }
  for($i=0;$i -lt $points.Length;$i++) {
    $kind=$types[$i] -band 7
    if($kind -eq 0){[void]$builder.Append('M'+(Coordinate $points[$i]))}
    elseif($kind -eq 1){[void]$builder.Append('L'+(Coordinate $points[$i]))}
    elseif($kind -eq 3){[void]$builder.Append('C'+(Coordinate $points[$i])+' '+(Coordinate $points[$i+1])+' '+(Coordinate $points[$i+2]));$i+=2}
    if(($types[$i] -band 128) -ne 0){[void]$builder.Append('Z')}
  }
  $path.Dispose();$fontFamily.Dispose()
  return $builder.ToString()
}

if(-not $Finish) {
  # 人工几何重建，不把低清位图嵌进 SVG 冒充矢量。所有形状均为路径。
  $mark = '<path d="M14 27L34 80L54 30C58 18 69 14 79 19C91 25 95 40 88 52C82 63 70 65 60 61V88" fill="none" stroke="COLOR" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
  $word = '<g fill="none" stroke="INK" stroke-width="9" stroke-linecap="square" stroke-linejoin="round"><path d="M115 19V58M149 19V58M115 39H149"/><ellipse cx="181" cy="38.5" rx="21" ry="22"/><path d="M214 58V19L245 58V19"/><ellipse cx="277" cy="38.5" rx="21" ry="22"/><path d="M310 58V19H328C346 19 347 41 329 41H323L346 58"/></g>'
  $chinese = Get-TextOutline '微品致远' 15.5 201 70
  # 原标识第一个 O 右上角有一处小红色角标，横版深浅底均保留。
  $oAccent = '<path data-brand-detail="o-red-accent" d="M198 14H207V25Z" fill="COLOR"/>'
  foreach($variant in @('light','dark')) {
    $ink=if($variant -eq 'light'){'#18191c'}else{'#ffffff'}
    $red=if($variant -eq 'light'){'#ee2b55'}else{'#ff5477'}
    $content=$mark.Replace('COLOR',$red)+$word.Replace('INK',$ink)+$oAccent.Replace('COLOR',$red)+'<path d="M112 83H190M279 83H350" stroke="'+$ink+'" stroke-opacity=".35" stroke-width="1"/><path fill="'+$ink+'" fill-rule="evenodd" d="'+$chinese+'"/>'
    Write-GeneratedSvg "logo-horizontal-$variant.svg" ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 368 106" role="img" aria-label="VP HONOR 微品致远"><title>VP HONOR 微品致远 — 重建确认稿</title>'+ $content +'</svg>')
  }
  Write-GeneratedSvg 'mark-vp.svg' ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" role="img" aria-label="VP"><title>VP 图形 — 重建确认稿</title>'+$mark.Replace('COLOR','#ee2b55')+'</svg>')
  $icon='<rect x="64" y="64" width="896" height="896" rx="200" fill="#ffffff"/><rect x="65" y="65" width="894" height="894" rx="199" fill="none" stroke="#dedee3" stroke-width="2"/><g transform="translate(96 80) scale(7.7)">'+$mark.Replace('COLOR','#ee2b55')+'</g>'
  Write-GeneratedSvg 'app-icon.svg' ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="VP 应用图标"><title>VP 应用图标 — A 方向确认稿</title>'+$icon+'</svg>')
  Write-Output '已生成4份纯路径SVG：横版深浅底、VP图形、应用图标。'
} else {
  # 浏览器从 SVG 高分辨率渲染后，统一缩采样，ICO 按标准目录封装 PNG 帧。
  $master=[Drawing.Bitmap]::new((Join-Path $pngRoot 'app-icon-1024.png'))
  $sizes=@(16,24,32,48,64,128,256,512)
  foreach($size in $sizes){
    $bitmap=[Drawing.Bitmap]::new($size,$size,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics=[Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingMode=[Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($master,0,0,$size,$size)
    $bitmap.Save((Join-Path $pngRoot "icon_$size.png"),[Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose();$bitmap.Dispose()
  }
  $master.Dispose()
  $icoSizes=@(16,24,32,48,64,128,256)
  $frames=@($icoSizes | ForEach-Object {,[IO.File]::ReadAllBytes((Join-Path $pngRoot "icon_$_.png"))})
  $stream=[IO.File]::Create((Join-Path $assetRoot 'app-icon.ico'))
  $writer=[IO.BinaryWriter]::new($stream)
  $writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]$frames.Count)
  $offset=6+16*$frames.Count
  for($i=0;$i -lt $frames.Count;$i++){
    $size=$icoSizes[$i];$dim=if($size -eq 256){0}else{$size}
    $writer.Write([byte]$dim);$writer.Write([byte]$dim);$writer.Write([byte]0);$writer.Write([byte]0)
    $writer.Write([uint16]1);$writer.Write([uint16]32);$writer.Write([uint32]$frames[$i].Length);$writer.Write([uint32]$offset)
    $offset+=$frames[$i].Length
  }
  foreach($frame in $frames){$writer.Write([byte[]]$frame)}
  $writer.Dispose();$stream.Dispose()
  Write-Output '已生成PNG尺寸组与7帧Windows ICO。'
}
