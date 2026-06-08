$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $root

try {
    Write-Host "Compiling main.tex with pdflatex..."
    pdflatex -interaction=nonstopmode main.tex

    if (Test-Path "main.bcf") {
        Write-Host "Updating bibliography with biber..."
        biber main
    }

    if (Test-Path "main.acn") {
        Write-Host "Updating acronyms with makeindex..."
        makeindex -s main.ist -t main.alg -o main.acr main.acn
    }

    if (Test-Path "main.glo") {
        Write-Host "Updating glossary with makeindex..."
        makeindex -s main.ist -t main.glg -o main.gls main.glo
    }

    Write-Host "Resolving references..."
    pdflatex -interaction=nonstopmode main.tex
    pdflatex -interaction=nonstopmode main.tex

    Write-Host ""
    Write-Host "PDF generated at: $root\main.pdf"
}
finally {
    Pop-Location
}
