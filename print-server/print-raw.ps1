param(
    [Parameter(Mandatory=$true)][string]$Printer,
    [Parameter(Mandatory=$true)][string]$DataFile
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrint {
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO di);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBuf, int cbBuf, out int pcWritten);

    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
    public struct DOCINFO {
        [MarshalAs(UnmanagedType.LPTStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPTStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPTStr)] public string pDatatype;
    }
}
"@

$bytes = [System.IO.File]::ReadAllBytes($DataFile)
$hPrinter = [IntPtr]::Zero

if (-not [RawPrint]::OpenPrinter($Printer, [ref]$hPrinter, [IntPtr]::Zero)) {
    Write-Error "No se pudo abrir la impresora: $Printer"
    exit 1
}

$di = New-Object RawPrint+DOCINFO
$di.pDocName  = "ESC/POS"
$di.pDatatype = "RAW"

$jobId = [RawPrint]::StartDocPrinter($hPrinter, 1, [ref]$di)
if ($jobId -le 0) {
    [RawPrint]::ClosePrinter($hPrinter)
    Write-Error "StartDocPrinter fallo"
    exit 1
}

[RawPrint]::StartPagePrinter($hPrinter) | Out-Null
$written = 0
[RawPrint]::WritePrinter($hPrinter, $bytes, $bytes.Length, [ref]$written) | Out-Null
[RawPrint]::EndPagePrinter($hPrinter) | Out-Null
[RawPrint]::EndDocPrinter($hPrinter) | Out-Null
[RawPrint]::ClosePrinter($hPrinter) | Out-Null

Write-Output "OK: $written bytes enviados a $Printer"
