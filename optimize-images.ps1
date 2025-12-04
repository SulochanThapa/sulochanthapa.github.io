# Image Optimization Script for Portfolio
# This script creates responsive image variants and optimizes images

Write-Host "🖼️  Image Optimization Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if ImageMagick or similar tools are available
$hasImageMagick = $null -ne (Get-Command magick -ErrorAction SilentlyContinue)
$hasSharp = $null -ne (Get-Command sharp -ErrorAction SilentlyContinue)

if (-not $hasImageMagick -and -not $hasSharp) {
    Write-Host "⚠️  Warning: Neither ImageMagick nor sharp-cli found." -ForegroundColor Yellow
    Write-Host "`nTo install ImageMagick:" -ForegroundColor Yellow
    Write-Host "  Windows: choco install imagemagick" -ForegroundColor White
    Write-Host "  or download from: https://imagemagick.org/script/download.php`n" -ForegroundColor White
    Write-Host "To install sharp-cli:" -ForegroundColor Yellow
    Write-Host "  npm install -g sharp-cli`n" -ForegroundColor White
}

# Define image optimization targets
$images = @(
    @{
        Source = "assets/images/sulochan-thapa.webp"
        Sizes = @(216, 432, 730)  # 1x, 2x, original
        Quality = 85
    },
    @{
        Source = "assets/images/projects/myblog.JPG"
        Sizes = @(316, 632, 948)  # Small, medium, large
        Quality = 80
        ConvertToWebP = $true
    },
    @{
        Source = "assets/images/projects/ocr.JPG"
        Sizes = @(316, 632, 948)
        Quality = 80
        ConvertToWebP = $true
    }
)

function Optimize-Image {
    param(
        [string]$Source,
        [int[]]$Sizes,
        [int]$Quality = 85,
        [bool]$ConvertToWebP = $false
    )

    if (-not (Test-Path $Source)) {
        Write-Host "❌ File not found: $Source" -ForegroundColor Red
        return
    }

    $directory = Split-Path $Source
    $filename = [System.IO.Path]::GetFileNameWithoutExtension($Source)
    $extension = [System.IO.Path]::GetExtension($Source)

    Write-Host "📁 Processing: $Source" -ForegroundColor Green

    foreach ($size in $Sizes) {
        $outputFile = Join-Path $directory "$filename-${size}w$extension"
        
        if ($hasImageMagick) {
            # Using ImageMagick
            Write-Host "  → Creating ${size}px variant..." -ForegroundColor Cyan
            magick convert $Source -resize "${size}x" -quality $Quality $outputFile
            
            if ($ConvertToWebP) {
                $webpFile = Join-Path $directory "$filename-${size}w.webp"
                magick convert $Source -resize "${size}x" -quality $Quality $webpFile
                Write-Host "  ✓ Created: $webpFile" -ForegroundColor Green
            }
        }
        elseif ($hasSharp) {
            # Using sharp-cli
            Write-Host "  → Creating ${size}px variant..." -ForegroundColor Cyan
            sharp resize $size -i $Source -o $outputFile --quality $Quality
            
            if ($ConvertToWebP) {
                $webpFile = Join-Path $directory "$filename-${size}w.webp"
                sharp resize $size -i $Source -o $webpFile --quality $Quality --format webp
                Write-Host "  ✓ Created: $webpFile" -ForegroundColor Green
            }
        }
        
        Write-Host "  ✓ Created: $outputFile" -ForegroundColor Green
    }
}

# Process each image
foreach ($image in $images) {
    Optimize-Image -Source $image.Source -Sizes $image.Sizes -Quality $image.Quality -ConvertToWebP $image.ConvertToWebP
}

Write-Host "`n✅ Image optimization complete!" -ForegroundColor Green
Write-Host "`n📊 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update HTML files to use responsive srcset" -ForegroundColor White
Write-Host "  2. Verify image quality and file sizes" -ForegroundColor White
Write-Host "  3. Test on different devices" -ForegroundColor White
Write-Host "  4. Run Lighthouse audit" -ForegroundColor White

# Display file size comparison
Write-Host "`n📈 File Size Report:" -ForegroundColor Cyan
foreach ($image in $images) {
    if (Test-Path $image.Source) {
        $fileInfo = Get-Item $image.Source
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        Write-Host "  $($image.Source): ${sizeKB} KB" -ForegroundColor White
    }
}
